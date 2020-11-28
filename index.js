const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  region: "eu-south-1"
});

const lambda = new AWS.Lambda({
  apiVersion: "2015-03-31",
  region: "eu-south-1"
});

const ses = new AWS.SESV2({
  apiVersion: "2019-09-27",
  region: "eu-central-1"
});

async function setData(updateData) {
  try {
    databaseData = await getDatabaseData();

    await ses.sendEmail({
      FromEmailAddress: `corona-bz-backup <${process.env.BACKUP_FROM_EMAIL}>`,
      Destination: {
        ToAddresses: [process.env.BACKUP_TO_EMAIL]
      },
      Content: {
        Simple: {
          Subject: {
            Data: `corona-bz-api backup`,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: JSON.stringify(databaseData),
              Charset: "UTF-8",
            },
          },
        },
      },
    }).promise();

    const foundIndex = databaseData.findIndex((data) => data.date === updateData.date);

    if (foundIndex < 0) {
      databaseData.push(updateData);
    } else {
      databaseData[foundIndex] = updateData;
    }

    await saveDatabaseData();

    const environmentVariables = (await lambda.getFunctionConfiguration({
      FunctionName: process.env.LAMBDA_FUNCTION_NAME
    }).promise()).Environment.Variables;

    environmentVariables["UPDATED"] = new Date().toString();

    await lambda.updateFunctionConfiguration({
      FunctionName: process.env.LAMBDA_FUNCTION_NAME,
      Environment: {
        Variables: {
          ...environmentVariables
        }
      }
    }).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ success: true })
    };
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

async function setMunicipalityData(updateData) {
  try {
    await s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: `${process.env.S3_MUNICIPALITIES_FOLDER}/${updateData.date}.json`,
      Body: Buffer.from(JSON.stringify(updateData.data), "utf-8")
    }).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ success: true })
    };
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

async function mapData(data) {
  try {
    let mappedData = data.map((entry, index) => ({
      date: entry.date,

      positiveTested: entry.positiveTested,
      newPositiveTested: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].positiveTested) === false ? entry.positiveTested - data[index - 1].positiveTested : entry.positiveTested,

      positiveAntigenTests: entry.positiveAntigenTests ?? 0,
      newPositiveAntigenTests: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].positiveAntigenTests) === false ? entry.positiveAntigenTests - data[index - 1].positiveAntigenTests : entry.positiveAntigenTests ?? 0,

      quarantinedPeople: entry.quarantinedPeople,
      newQuarantinedPeople: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].quarantinedPeople) === false ? entry.quarantinedPeople - data[index - 1].quarantinedPeople : entry.quarantinedPeople,

      currentlyPositiveTested: entry.currentlyPositiveTested,
      newCurrentlyPositiveTested: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].currentlyPositiveTested) === false ? entry.currentlyPositiveTested - data[index - 1].currentlyPositiveTested : entry.currentlyPositiveTested,

      cured: entry.cured,
      newCured: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].cured) === false ? entry.cured - data[index - 1].cured : entry.cured,

      deceased: entry.deceased,
      newDeceased: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].deceased) === false ? entry.deceased - data[index - 1].deceased : entry.deceased,

      numberTests: entry.numberTests,
      newNumberTests: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].numberTests) === false ? entry.numberTests - data[index - 1].numberTests : entry.numberTests,

      numberAntigenTests: entry.numberAntigenTests ?? 0,
      newNumberAntigenTests: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].numberAntigenTests) === false ? entry.numberAntigenTests - data[index - 1].numberAntigenTests : entry.numberAntigenTests ?? 0,

      numberTestedPeople: entry.numberTestedPeople,
      newNumberTestedPeople: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].numberTestedPeople) === false ? entry.numberTestedPeople - data[index - 1].numberTestedPeople : entry.numberTestedPeople,

      // number of hospitalized people
      numberHospitalizedPeople: entry.numberHospitalizedPeople,
      newNumberHospitalizedPeople: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].numberHospitalizedPeople) === false ? entry.numberHospitalizedPeople - data[index - 1].numberHospitalizedPeople : entry.numberHospitalizedPeople,

      // number of people in intensive therapy
      numberIntensiveTherapy: entry.numberIntensiveTherapy,
      newNumberIntensiveTherapy: [null, undefined].includes(data[index - 1]) === false && [null, undefined].includes(data[index - 1].numberIntensiveTherapy) === false ? entry.numberIntensiveTherapy - data[index - 1].numberIntensiveTherapy : entry.numberIntensiveTherapy,
    }));

    const quotient = 533439 / 100000;
    mappedData = mappedData.map((entry, index) => ({
      ...entry,
      sevenDaysAveragePositiveTested: index < 6 ? null : mappedData.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue += currentValue.newPositiveTested, 0) / 7,
      sevenDaysIncidencePerOneHundredThousandPositiveTested: index < 6 ? null : mappedData.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue += currentValue.newPositiveTested, 0) / quotient,

      sevenDaysAverageNumberTests: index < 6 ? null : mappedData.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue += currentValue.newNumberTests, 0) / 7,
      sevenDaysIncidencePerOneHundredThousandNumberTests: index < 6 ? null : mappedData.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue += currentValue.newNumberTests, 0) / quotient,

      sevenDaysAverageNumberTestedPeople: index < 6 ? null : mappedData.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue += currentValue.newNumberTestedPeople, 0) / 7,
      sevenDaysIncidencePerOneHundredNumberTestedPeople: index < 6 ? null : mappedData.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue += currentValue.newNumberTestedPeople, 0) / quotient,

      sevenDaysAverageDeceased: index < 6 ? null : mappedData.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue += currentValue.newDeceased, 0) / 7,
      sevenDaysIncidencePerOneHundredDeceased: index < 6 ? null : mappedData.slice(index - 6, index + 1).reduce((previousValue, currentValue) => previousValue += currentValue.newDeceased, 0) / quotient,
    }));

    return mappedData;
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
    && event.headers["simedia-auth-token"] === process.env.AUTH_TOKEN
  ) {
    if (event && event.queryStringParameters && event.queryStringParameters.type === "general") {
      return await setData(JSON.parse(event.body));
    } else if (event && event.queryStringParameters && event.queryStringParameters.type === "municipalities") {
      return await setMunicipalityData(JSON.parse(event.body));
    }
  } else {
    const format = event && event.queryStringParameters && event.queryStringParameters.format === "csv" ? "csv" : "json";

    try {
      if (databaseData === null) {
        databaseData = await getDatabaseData();
      }

      const data = await mapData(databaseData);
      const dataKeys = Object.keys(data[0]).sort();

      if (format === "csv") {
        let result = "";

        // add header row
        result += dataKeys.join(",") + "\r\n";

        // add data rows
        for (let i = 0; i < data.length; i++) {
          const entry = data[i];

          for (let j = 0; j < dataKeys.length; j++) {
            const dataKey = dataKeys[j];
            
            result += entry[dataKey] + (j >= dataKeys.length - 1 ? "\r\n" : ",");
          }
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
            sevenDaysIncidencePerOneHundredThousandPositiveTested: entry.sevenDaysIncidencePerOneHundredThousandPositiveTested,
            positiveAntigenTests: entry.positiveAntigenTests,
            newPositiveAntigenTests: entry.newPositiveAntigenTests,
            quarantinedPeople: entry.quarantinedPeople,
            newQuarantinedPeople: entry.newQuarantinedPeople,
            currentlyPositiveTested: entry.currentlyPositiveTested,
            newCurrentlyPositiveTested: entry.newCurrentlyPositiveTested,
            cured: entry.cured,
            newCured: entry.newCured,
            deceased: entry.deceased,
            newDeceased: entry.newDeceased,
            sevenDaysAverageDeceased: entry.sevenDaysAverageDeceased,
            sevenDaysIncidencePerOneHundredDeceased: entry.sevenDaysIncidencePerOneHundredDeceased,
            numberTests: entry.numberTests,
            newNumberTests: entry.newNumberTests,
            sevenDaysAverageNumberTests: entry.sevenDaysAverageNumberTests,
            sevenDaysIncidencePerOneHundredThousandNumberTests: entry.sevenDaysIncidencePerOneHundredThousandNumberTests,
            numberAntigenTests: entry.numberAntigenTests,
            newNumberAntigenTests: entry.newNumberAntigenTests,
            numberTestedPeople: entry.numberTestedPeople,
            newNumberTestedPeople: entry.newNumberTestedPeople,
            sevenDaysAverageNumberTestedPeople: entry.sevenDaysAverageNumberTestedPeople,
            sevenDaysIncidencePerOneHundredNumberTestedPeople: entry.sevenDaysIncidencePerOneHundredNumberTestedPeople,
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
