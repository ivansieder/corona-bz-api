const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  region: "eu-south-1",
  credentials: new AWS.Credentials(process.env.ACCESS_KEY_ID, process.env.SECRET_ACCESS_KEY)
});

const lambda = new AWS.Lambda({
  apiVersion: "2015-03-31",
  region: "eu-south-1"
});

async function setData(updateData) {
  try {
    databaseData = await getDatabaseData();

    const foundIndex = databaseData.findIndex((data) => data.date === updateData.date);

    if (foundIndex < 0) {
      databaseData.push(updateData);
    } else {
      databaseData[foundIndex] = updateData;
    }

    await saveDatabaseData();

    await lambda.updateFunctionConfiguration({
      FunctionName: process.env.LAMBDA_FUNCTION_NAME,
      Environment: {
        UPDATED: new Date()
      }
    }).promise();
  } catch (error) {
    console.error(error);
  }
}

async function mapData(data) {
  try {
    return data.map((entry, index) => ({
      date: entry.date,

      positiveTested: entry.positiveTested,
      newPositiveTested: [null, undefined].includes(data[index - 1]) === false ? entry.positiveTested - data[index - 1].positiveTested : entry.positiveTested,
      sevenDaysAveragePositiveTested: index < 6 ? null : data.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue.newPositiveTested + currentValue.newPositiveTested, 0) / 7,

      currentlyPositiveTested: entry.currentlyPositiveTested,
      newCurrentlyPositiveTested: [null, undefined].includes(data[index - 1]) === false ? entry.currentlyPositiveTested - data[index - 1].currentlyPositiveTested : entry.currentlyPositiveTested,

      cured: entry.cured,
      newCured: [null, undefined].includes(data[index - 1]) === false ? entry.cured - data[index - 1].cured : entry.cured,

      deceased: entry.deceased,
      newDeceased: [null, undefined].includes(data[index - 1]) === false ? entry.deceased - data[index - 1].deceased : entry.deceased,

      numberTests: entry.numberTests,
      newNumberTests: [null, undefined].includes(data[index - 1]) === false ? entry.numberTests - data[index - 1].numberTests : entry.numberTests,
      sevenDaysAverageNumberTests: index < 6 ? null : data.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue.newNumberTests + currentValue.newNumberTests, 0) / 7,

      numberTestedPeople: entry.numberTestedPeople,
      newNumberTestedPeople: [null, undefined].includes(data[index - 1]) === false ? entry.numberTestedPeople - data[index - 1].numberTestedPeople : entry.numberTestedPeople,
      sevenDaysAverageNumberTestedPeople: index < 6 ? null : data.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue.newNumberTestedPeople + currentValue.newNumberTestedPeople, 0) / 7,

      // number of hospitalized people
      numberHospitalizedPeople: entry.numberHospitalizedPeople,
      newNumberHospitalizedPeople: [null, undefined].includes(data[index - 1]) === false ? entry.numberHospitalizedPeople - data[index - 1].numberHospitalizedPeople : entry.numberHospitalizedPeople,

      // number of people in intensive therapy
      numberIntensiveTherapy: entry.numberIntensiveTherapy,
      newNumberIntensiveTherapy: [null, undefined].includes(data[index - 1]) === false ? entry.numberIntensiveTherapy - data[index - 1].numberIntensiveTherapy : entry.numberIntensiveTherapy,
    }));
  } catch (error) {
    throw error;
  }
}

let databaseData = null;

const getDatabaseData = async () => {
  const s3Data = await s3.getObject({
    Bucket: process.env.S3_BUCKET,
    Key: process.env.S3_FILENAME
  }).promise();

  return JSON.parse(Buffer.from(s3Data.Body, "utf-8"));
};

const saveDatabaseData = async () => {
  await s3.putObject({
    Bucket: process.env.S3_BUCKET,
    Key: process.env.S3_FILENAME,
    Body: Buffer.from(JSON.stringify(databaseData), "utf-8")
  }).promise();
};

exports.handler = async (event) => {
  if (
    event.httpMethod === "POST"
    && event.headers["SiMedia-Auth-Token"] === process.env.AUTH_TOKEN
  ) {
    await setData(event.body);
  } else {
    const format = event && event.queryStringParameters && event.queryStringParameters.format === "csv" ? "csv" : "json";

    try {
      if (databaseData === null) {
        databaseData = await getDatabaseData();
      }

      const data = await mapData(databaseData);
      const dataKeys = Object.keys(data);

      if (format === "csv") {
        let result = "";

        // add header row
        result += dataKeys.join(",") + "\r\n";

        // add data rows
        for (const entry of data) {
          result += entry.date + ",";
          result += entry.positiveTested + ",";
          result += entry.newPositiveTested + ",";
          result += entry.sevenDaysAveragePositiveTested + ",";
          result += entry.currentlyPositiveTested + ",";
          result += entry.newCurrentlyPositiveTested + ",";
          result += entry.cured + ",";
          result += entry.newCured + ",";
          result += entry.deceased + ",";
          result += entry.newDeceased + ",";
          result += entry.numberTests + ",";
          result += entry.newNumberTests + ",";
          result += entry.sevenDaysAverageNumberTests + ",";
          result += entry.numberTestedPeople + ",";
          result += entry.newNumberTestedPeople + ",";
          result += entry.sevenDaysAverageNumberTestedPeople + ",";
          result += entry.numberHospitalizedPeople + ",";
          result += entry.newNumberHospitalizedPeople + ",";
          result += entry.numberIntensiveTherapy + ",";
          result += entry.newNumberIntensiveTherapy + "\r\n";
        }

        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/csv"
          },
          body: result
        };
      } else {
        let result = [];

        // add data rows
        for (const entry of data) {
          result.push({
            date: entry.date,
            positiveTested: entry.positiveTested,
            newPositiveTested: entry.newPositiveTested,
            sevenDaysAveragePositiveTested: entry.sevenDaysAveragePositiveTested,
            currentlyPositiveTested: entry.currentlyPositiveTested,
            newCurrentlyPositiveTested: entry.newCurrentlyPositiveTested,
            cured: entry.cured,
            newCured: entry.newCured,
            deceased: entry.deceased,
            newDeceased: entry.newDeceased,
            numberTests: entry.numberTests,
            newNumberTests: entry.newNumberTests,
            sevenDaysAverageNumberTests: entry.sevenDaysAverageNumberTests,
            numberTestedPeople: entry.numberTestedPeople,
            newNumberTestedPeople: entry.newNumberTestedPeople,
            sevenDaysAverageNumberTestedPeople: entry.sevenDaysAverageNumberTestedPeople,
            numberHospitalizedPeople: entry.numberHospitalizedPeople,
            newNumberHospitalizedPeople: entry.newNumberHospitalizedPeople,
            numberIntensiveTherapy: entry.numberIntensiveTherapy,
            newNumberIntensiveTherapy: entry.newNumberIntensiveTherapy,
          })
        }

        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(result)
        };
      }
    } catch (error) {
      console.error(error);

      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: "an error happened, i have no idea why ¯\\_(ツ)_/¯, if you want to, write me at ivan@sieder.xyz and I'll check that" })
      };
    }
  }
}
