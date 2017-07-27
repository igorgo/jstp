#!/usr/bin/env node

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const readline = require('readline');

const UNICODE_VERSION = '10.0.0';
const UCD_LINK = 'http://www.unicode.org/Public/' + UNICODE_VERSION +
  '/ucd/DerivedCoreProperties.txt';
const fullTablesFilename = 'unicode_tables.h';
const rangeTablesFilename = 'unicode_range_tables.h';
const getHeaderGuard = filename =>
  `SRC_${filename.replace(/\W/g, '_').toUpperCase()}_`;
const getOutputPath = filename => path.join(__dirname, '../src', filename);

const getFileHeader = filename =>
  `// Copyright (c) 2017 JSTP project authors. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
//
//
// This file contains data derived from the Unicode Data Files.
// The following license applies to this data:
//
// COPYRIGHT AND PERMISSION NOTICE
//
// Copyright © 1991-2017 Unicode, Inc. All rights reserved.
// Distributed under the Terms of Use in http://www.unicode.org/copyright.html.
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of the Unicode data files and any associated documentation
// (the "Data Files") or Unicode software and any associated documentation
// (the "Software") to deal in the Data Files or Software
// without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, and/or sell copies of
// the Data Files or Software, and to permit persons to whom the Data Files
// or Software are furnished to do so, provided that either
// (a) this copyright and permission notice appear with all copies
// of the Data Files or Software, or
// (b) this copyright and permission notice appear in associated
// Documentation.
//
// THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF
// ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT OF THIRD PARTY RIGHTS.
// IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS
// NOTICE BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL
// DAMAGES, OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
// DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
// TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
// PERFORMANCE OF THE DATA FILES OR SOFTWARE.
//
// Except as contained in this notice, the name of a copyright holder
// shall not be used in advertising or otherwise to promote the sale,
// use or other dealings in these Data Files or Software without prior
// written authorization of the copyright holder.
//
//
// This file is automatically generated by tools/make-unicode-tables.js.
// Unicode version ${UNICODE_VERSION}.
//
// Do not edit this file manually!

#ifndef ${getHeaderGuard(filename)}
#define ${getHeaderGuard(filename)}

`;

const rangeTablesHeader = `#include <cstddef>
#include <cstdint>

using std::size_t;
using std::uint32_t;

typedef struct {
  uint32_t start;
  uint32_t end;
} unicode_range;

`;

const idStartCategoryName = 'ID_Start';
const idContinueCategoryName = 'ID_Continue';

const highestUnicodeValue = 0x10FFFF;

const idStartValues = new Array(highestUnicodeValue + 1);
const idContinueValues = new Array(highestUnicodeValue + 1);

const idStartRanges = [];
const idContinueRanges = [];

let idStartTotalCount = 0;
let idContinueTotalCount = 0;

const lineRegex = /^([0-9A-F]{4,6})(?:\.\.([0-9A-F]{4,6}))? *; (\w+) #.*$/;

http.get(UCD_LINK, (res) => {
  const linereader = readline.createInterface({ input: res, historySize: 0 });
  linereader.on('line', (line) => {
    const values = lineRegex.exec(line);
    if (values !== null) {
      const [ , start, end, category  ] = values;
      const startValue = parseInt(start, 16);
      const endValue = parseInt(end || start, 16);
      if (category === idStartCategoryName) {
        idStartTotalCount += endValue - startValue + 1;
        idStartRanges.push([startValue, endValue]);
        for (let i = startValue; i <= endValue; i++) {
          idStartValues[i] = 1;
        }
      } else if (category === idContinueCategoryName) {
        idContinueTotalCount += endValue - startValue + 1;
        idContinueRanges.push([startValue, endValue]);
        for (let i = startValue; i <= endValue; i++) {
          idContinueValues[i] = 1;
        }
      }
    }
  });
  linereader.on('close', finish);
});

function createFullTableArray(arrayName, array) {
  let str = `const unsigned char ${arrayName}[]={0,`;
  for (let i = 1; i <= highestUnicodeValue; i++) {
    str += array[i] ? '1' : '0';
    str += ',';
  }
  str += '};\n';
  return str;
}

function createArrayOfRanges(arrayName, array) {
  let str = `const unicode_range ${arrayName}[] = {\n  `;
  array.forEach((range, index) => {
    str += `{0x${range[0].toString(16)}, 0x${range[1].toString(16)}}`;
    if (index !== array.length - 1) {
      if ((index + 1) % 3 === 0) {
        str += ',\n  ';
      } else  {
        str += ', ';
      }
    } else {
      str += '\n';
    }
  });
  str += '};\n\n';
  str += `const size_t ${arrayName}_COUNT = ${array.length};\n\n`;
  return str;
}

function finish() {
  console.log(`ID_Start code points found: ${idStartTotalCount}`);
  console.log(`ID_Continue code points found: ${idContinueTotalCount}`);

  idStartValues[0x24] = 1; // '$'
  idContinueValues[0x24] = 1;

  idStartValues[0x5F] = 1; // '_'
  idContinueValues[0x5F] = 1;

  idContinueValues[0x200C] = 1; // ZWNJ
  idContinueValues[0x200D] = 1; // ZWJ

  let fullTablesResult = getFileHeader(fullTablesFilename);
  let rangeTablesResult = getFileHeader(rangeTablesFilename) +
    rangeTablesHeader;

  fullTablesResult += createFullTableArray('ID_START_FULL', idStartValues);
  fullTablesResult +=
    createFullTableArray('ID_CONTINUE_FULL', idContinueValues);

  rangeTablesResult += createArrayOfRanges('ID_START_RANGES', idStartRanges);
  rangeTablesResult +=
    createArrayOfRanges('ID_CONTINUE_RANGES', idContinueRanges);

  fullTablesResult += `#endif  // ${getHeaderGuard(fullTablesFilename)}\n`;
  rangeTablesResult += `#endif  // ${getHeaderGuard(rangeTablesFilename)}\n`;

  fs.writeFileSync(getOutputPath(fullTablesFilename), fullTablesResult);
  fs.writeFileSync(getOutputPath(rangeTablesFilename), rangeTablesResult);
}