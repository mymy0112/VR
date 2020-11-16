const fs = require('fs')
const readline = require('readline');

const dataFile = './tmp/group1part1.txt';
const outputFile = './out/group1part1.txt'
const pointsOffset = 25 //in cm this is added since the cameras are not exactly in the corner
const rectSize = { height: 800 - pointsOffset, width: 1200 - pointsOffset } //in cm 

const pointsPos = {
  A: { x: 0, y: 0 },
  B: { x: rectSize.width, y: 0 },
  C: { x: rectSize.width, y: rectSize.height },
  D: { x: 0, y: rectSize.height },

  E: { x: 0, y: 0 },
  F: { x: rectSize.width, y: 0 },
  G: { x: rectSize.width, y: rectSize.height },
  H: { x: 0, y: rectSize.height },
}


async function main() {

  const fileArr = await readFile(dataFile)

  const cleanedFile = cleanFile(fileArr)

  const formattedData = formatData(cleanedFile)

  const pointsPositions = getPointPositions(formattedData)

  const pointDistances = getPointDistances(pointsPositions)

  console.log('----------RESULT--------------------------')
  console.log(pointDistances)
  console.log('------------------------------------------')



  await new Promise((resolve) => {
    fs.appendFile(outputFile, JSON.stringify(pointDistances), function (err) {
      // if (err) {
      //   return console.log(err);
      // }
      resolve()
    });
  })


  return pointDistances
}

//simple helpers
function isTitleLine(lineString) {
  return lineString.includes('**')
}

function removeSpaces(string) {
  return string.replace(/\s/g, '')
}

function sqrd(num) {
  return Math.pow(num, 2)
}



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

function removeDuplicateCharacters(string) {
  return string
    .split('')
    .filter(function (item, pos, self) {
      const x = /[0-9]+/g
      if (x.test(item)) {
        return true
      } else {
        return self.indexOf(item) == pos;
      }
    })
    .join('');
}

function cleanFile(fileArr) {
  return fileArr.filter(line => line !== '').map(line => {
    let newLine = line
    if (!isTitleLine(line)) { //we know its a line with actual content
      newLine = removeSpaces(newLine) //remove epmty spaces from data lines
      newLine = removeDuplicateCharacters(newLine)
    }


    return newLine
  })
}

function formatData(cleanFileArr) {
  const formattedData = {}
  let currDataKey = null

  cleanFileArr.forEach(line => {
    console.log(line)
    if (isTitleLine(line)) {
      const nameRegx = /Page[0-9]+/g
      currDataKey = removeSpaces(line).match(nameRegx)[0].toLowerCase()
      formattedData[currDataKey] = {}
    } else {

      const valuesRegex = /[A-Ha-h][0-9]+/g
      const pointsInLine = (line.match(valuesRegex) || []).forEach(rawpoint => {
        const pointLabel = rawpoint.match(/[A-Ha-h]/g)[0].toUpperCase()
        const pointVal = rawpoint.match(/[0-9]+/g)[0]

        const pointNum = /[A-D]/g.test(pointLabel) ? 'point-1' : 'point-2';

        if (formattedData[currDataKey][pointNum] == null) {
          formattedData[currDataKey][pointNum] = {} //initalize point section
        }
        formattedData[currDataKey][pointNum][pointLabel] = Number(pointVal) //addns the point value to the data object
      })
    }
  })

  return formattedData;
}


function calcPointPos(dist1, dist2, dist3) {
  const A = 2 * (pointsPos[dist3.label].y - pointsPos[dist1.label].y)
  const Ainv = 2 * (pointsPos[dist2.label].y - pointsPos[dist1.label].y)

  const B = 2 * (pointsPos[dist3.label].x - pointsPos[dist1.label].x)
  const Binv = 2 * (pointsPos[dist2.label].x - pointsPos[dist1.label].x)

  const triang1 = sqrd(dist1.value) - sqrd(dist3.value) + sqrd(pointsPos[dist3.label].y) - sqrd(pointsPos[dist1.label].y) + sqrd(pointsPos[dist3.label].x) - sqrd(pointsPos[dist1.label].x)
  const triang2 = sqrd(dist1.value) - sqrd(dist2.value) + sqrd(pointsPos[dist2.label].y) - sqrd(pointsPos[dist1.label].y) + sqrd(pointsPos[dist2.label].x) - sqrd(pointsPos[dist1.label].x)

  const X = (triang1 * Ainv - triang2 * A) / (B * Ainv - Binv * A)
  const Y = (triang1 * Binv - triang2 * B) / (Binv * A - B * Ainv)

  return { x: X, y: Y }
}

//Todo ignore page if more than 2 points are missing
function getPointPositions(formattedData) {
  let newFormattedData = formattedData
  let pagesTodrop = []
  Object.keys(formattedData).forEach(pageName => {
    Object.keys(formattedData[pageName]).forEach(pointName => {
      const points = formattedData[pageName][pointName]
      try {
        if (Object.keys(points).length < 3) { //we don't have enough points
          throw 'err'
        }

        const point1 = { label: Object.keys(points)[0], value: points[Object.keys(points)[0]] }
        const point2 = { label: Object.keys(points)[1], value: points[Object.keys(points)[1]] }
        const point3 = { label: Object.keys(points)[2], value: points[Object.keys(points)[2]] }

        newFormattedData[pageName][pointName] = calcPointPos(point1, point2, point3)
      } catch (err) {
        pagesTodrop.push(pageName)
        newFormattedData[pageName][pointName] = null
      }
    })
  })

  pagesTodrop.forEach(pageName => delete newFormattedData[pageName]) //remove problematic pages

  return newFormattedData
}

function getDistBetweenPoints(point1, point2) {
  return Math.sqrt(sqrd(point2.x - point1.x) + sqrd(point2.y - point1.y))
}

function getPointDistances(pointsPositions) {
  let pointDistances = pointsPositions;

  Object.keys(pointsPositions).forEach(page => {
    pointDistances[page] = getDistBetweenPoints(pointsPositions[page]['point-1'], pointsPositions[page]['point-2'])
  })

  return pointDistances
}



main()
