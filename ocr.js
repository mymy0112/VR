var fs = require('fs');
const fetch = require('node-fetch')
var request = require('request');
const delayinSecs = 1;
const apiKey = 'PDMXB6243888A';
const outputFile ="./tmp/group1part2.txt"
const inputFolder = './images/Group1part2'

// function to encode file data to base64 encoded string
function encode(file) {
  // read binary data
  var bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64');
}


async function runOcr(fileName) {
  const base64Data = 'data:image/jpeg;base64,' + encode(fileName)

  var options = {
    'method': 'POST',
    'url': 'https://api.ocr.space/parse/image',
    'headers': {
      'apikey': apiKey
    },
    formData: {
      'language': 'eng',
      'isTable': 'true',
      'OCREngine': '2',
      'isOverlayRequired': 'false',
      'issearchablepdfhidetextlayer': 'false',
      'base64Image': base64Data
    }
  };

  return await new Promise((resolve) => {
    request(options, async function (error, response) {
      try {
        if (error) throw new Error(error);
        const data = await JSON.parse(response.body)
        resolve({ name: fileName, text: data['ParsedResults'][0]['ParsedText'] })
      } catch (err) {
        console.error(fileName + ": Errored")
        try {
          const res = await JSON.parse(response.body)
          await logToErrors(fileName, err + "\n" + res)
          resolve(null)
        } catch (err) {
          await logToErrors(fileName, err)
          resolve(null)
        }
      }

    });
  })
}

async function logToErrors(filename, text) {
  await fs.appendFile("./tmp/errors.txt", `${filename}\n` + text, function (err) {
    if (err) {
      return console.log(err);
    }
  }); 

}

async function appendToDataFile(name, text) {
  await fs.appendFile(outputFile, `${name}\n${text}`, function (err) {
    if (err) {
      return console.log(err);
    }

    let msg = new Date()
    const timeStamp = `${msg.getHours()}:${msg.getMinutes()}:${msg.getSeconds()},${msg.getMilliseconds()}`

    console.log(timeStamp + " " + name + ": The file was saved!");
  });

}

function getImageNameList(folderDir) {

  const imageNames = []

  fs.readdirSync(folderDir).forEach(file => {
    imageNames.push(file)
  });

  return imageNames;
}

async function run() {
  const srcFolder = inputFolder

  const imageNames = getImageNameList(srcFolder)

  for (let i = 0; i < imageNames.length; i++) {
    const ocrRes = await runOcr(srcFolder + '/' + imageNames[i])
    if (ocrRes != null) {
      await appendToDataFile(ocrRes.name.replace(srcFolder + '/', '**'), ocrRes.text)
    } else {
      i--
    }

    await new Promise((resolve) => { setTimeout(() => resolve(), delayinSecs * 1000) })
  }
}

run()


process.on('uncaughtException', function (err) {
  console.log('Caught exception: ', err);
});
// appendToDataFile("name",'hoi')
