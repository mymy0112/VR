const fs = require('fs')
const readline = require('readline');

//the input and output file
async function readFile(fileName) {
  const fileByLine = []
  const result = await new Promise((resolve, reject) => {

    const readInterface = readline.createInterface({
      input: fs.createReadStream(fileName),

    });

    readInterface.on('line', function (line) {
      fileByLine.push(line)
    });

    readInterface.on('close', function (line) {
      resolve(fileByLine)
    });
  })

  return fileByLine
}


async function run(fileName, outputFile) {
  const arraydFile = await readFile(fileName);


  let currPage = 0;

  const goodArr = arraydFile.map(line => {
    if (line.includes('**')) {
      currPage++
      return `****** Result for Image/Page ${currPage} ******`
    }

    return line

  })

  for (let i = 0; i < goodArr.length; i++) {
    await new Promise((resolve) => {
      fs.appendFile(outputFile, `${goodArr[i]}\n`, function (err) {
        // if (err) {
        //   return console.log(err);
        // }
        resolve()
      });
    })

  }
}


run('./tmp/group1part2.txt', './tmp/goodfile.txt')


