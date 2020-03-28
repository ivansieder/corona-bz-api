const dayjs = require("dayjs");
var utc = require('dayjs/plugin/utc');
var customParseFormat = require('dayjs/plugin/customParseFormat')
const fetch = require("node-fetch");

dayjs.extend(utc);
dayjs.extend(customParseFormat)

const dataSourceUrl = "http://www.provinz.bz.it/sicherheit-zivilschutz/zivilschutz/aktuelle-daten-zum-coronavirus.asp"

async function getData() {
  try {
    const response = await fetch(dataSourceUrl);

    if (response.ok !== true) {
      throw new Error("the request fucked up");
    }

    // get the text as source, parse the data and convert it to JSON.
    // damn, I hate regex. Credits 99.99% to @abaumg
    const data = JSON.parse((await response.text()).match(/columns:\[\s([\[[\d',\[\] .a-zA-Z\r\n]*]*)]/gmi)[0].replace("columns:", "").replace(/'/gmi, "\""));

    // dates are hopefully the same for each data set ¯\_(ツ)_/¯
    // remove the first item, as that's the label
    const dates = data.find((dataEntry) => dataEntry[0] === "x1").slice(1);

    // positive tested
    const positiveTested = data.find((dataEntry) => dataEntry[0] === "Positiv getestet").slice(1).map((entry) => entry === null ? 0 : entry);
    const newPositiveTested = positiveTested.map((entry, index) => [null, undefined].includes(positiveTested[index - 1]) === false ? entry - positiveTested[index - 1] : entry);

    // currently positive tested
    const currentlyPositiveTested = data.find((dataEntry) => dataEntry[0] === "Aktuell positiv getestet").slice(1).map((entry) => entry === null ? 0 : entry);
    const newCurrentlyPositiveTested = currentlyPositiveTested.map((entry, index) => [null, undefined].includes(currentlyPositiveTested[index - 1]) === false ? entry - currentlyPositiveTested[index - 1] : entry);

    // cured
    const cured = data.find((dataEntry) => dataEntry[0] === "Geheilte").slice(1).map((entry) => entry === null ? 0 : entry);
    const newCured = cured.map((entry, index) => [null, undefined].includes(cured[index - 1]) === false ? entry - cured[index - 1] : entry);

    // deceased
    const deceased = data.find((dataEntry) => dataEntry[0] === "Verstorbene").slice(1).map((entry) => entry === null ? 0 : entry);
    const newDeceased = deceased.map((entry, index) => [null, undefined].includes(deceased[index - 1]) === false ? entry - deceased[index - 1] : entry);

    return {
      dates,

      positiveTested,
      newPositiveTested,

      currentlyPositiveTested,
      newCurrentlyPositiveTested,

      cured,
      newCured,

      deceased,
      newDeceased
    }
  } catch (error) {
    throw error;
  }
}

exports.handler = async (event, context) => {
  const format = event && event.queryStringParameters && event.queryStringParameters.format === "csv" ? "csv" : "json";

  try {
    const data = await getData();
    const dataKeys = Object.keys(data);

    if (format === "csv") {
      let result = "";

      // add header row
      result += dataKeys.join(",") + "\r\n";

      // add data rows
      for (const [index, date] of data.dates.entries()) {
        result += dayjs.utc(date, "DD.MM").format("YYYY-MM-DD") + ",";
        result += data.positiveTested[index] + ",";
        result += data.newPositiveTested[index] + ",";
        result += data.currentlyPositiveTested[index] + ",";
        result += data.newCurrentlyPositiveTested[index] + ",";
        result += data.cured[index] + ",";
        result += data.newCured[index] + ",";
        result += data.deceased[index] + ",";
        result += data.newDeceased[index] + "\r\n";
      }

      return {
        statusCode: 200,
        headers: {
            "Content-Type": "text/csv"
        },
        body: result
      };
    } else {
      let result = [];

      // add data rows
      for (const [index, date] of data.dates.entries()) {
        result.push({
          date: dayjs.utc(date, "DD.MM").format("YYYY-MM-DD"),
          positiveTested: data.positiveTested[index],
          newPositiveTested: data.newPositiveTested[index],
          currentlyPositiveTested: data.currentlyPositiveTested[index],
          newCurrentlyPositiveTested: data.newCurrentlyPositiveTested[index],
          cured: data.cured[index],
          newCured: data.newCured[index],
          deceased: data.deceased[index],
          newDeceased: data.newDeceased[index],
        })
      }

      return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(result)
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "an error happened, i have no idea why ¯\\_(ツ)_/¯, if you want to, write me at ivan@sieder.xyz and I'll check that" })
    };
  }
}