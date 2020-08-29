const dayjs = require("dayjs");
var utc = require('dayjs/plugin/utc');
var customParseFormat = require('dayjs/plugin/customParseFormat')
const fetch = require("node-fetch");

dayjs.extend(utc);
dayjs.extend(customParseFormat)

const dataSourceUrl = "https://afbs.provinz.bz.it/upload/coronavirus/chartDE.js"

async function getData() {
  try {
    const response = await fetch(dataSourceUrl);

    if (response.ok !== true) {
      throw new Error("the request fucked up");
    }

    // get the text as source, parse the data and convert it to JSON.
    // damn, I hate regex. Credits 99.99% to @abaumg
    const data = JSON.parse((await response.text()).match(/columns:\[\s([\[[\d',\[\] .a-zA-ZäöüÄÖÜ\r\n]*]*)]/gmi)[0].replace("columns:", "").replace(/'/gmi, "\""));

    // dates are hopefully the same for each data set ¯\_(ツ)_/¯
    // remove the first item, as that's the label
    const dates = data.find((dataEntry) => dataEntry[0] === "x1").slice(1);

    // positive tested
    const positiveTested = data.find((dataEntry) => dataEntry[0] === "Positiv getestet").slice(1).map((entry) => entry === null ? 0 : entry);
    const newPositiveTested = positiveTested.map((entry, index) => [null, undefined].includes(positiveTested[index - 1]) === false ? entry - positiveTested[index - 1] : entry);

    // currently positive tested
    const currentlyPositiveTested = data.find((dataEntry) => dataEntry[0] === "Positiv getestete abzüglich Geheilte und Verstorbene").slice(1).map((entry) => entry === null ? 0 : entry);
    const newCurrentlyPositiveTested = currentlyPositiveTested.map((entry, index) => [null, undefined].includes(currentlyPositiveTested[index - 1]) === false ? entry - currentlyPositiveTested[index - 1] : entry);

    // cured
    const cured = data.find((dataEntry) => dataEntry[0] === "Geheilte").slice(1).map((entry) => entry === null ? 0 : entry);
    const newCured = cured.map((entry, index) => [null, undefined].includes(cured[index - 1]) === false ? entry - cured[index - 1] : entry);
48.617
    // deceased
    const deceased = data.find((dataEntry) => dataEntry[0] === "Verstorbene").slice(1).map((entry) => entry === null ? 0 : entry);
    const newDeceased = deceased.map((entry, index) => [null, undefined].includes(deceased[index - 1]) === false ? entry - deceased[index - 1] : entry);

    // number of tests
    const numberTests = [1497, 1740, 2150, 2844, 3568, 4433, 5179, 5718, 6094, 6631, 7067, 7744, 8520, 9168, 10137, 10640, 11275, 11958, 12682, 13981, 15050, 15728, 16825, 17766, 18870, 19880, 20871, 22186, 23246, 24157, 24457, 25370, 26416, 27698, 28888, 30361, 31381, 31987, 32722, 33994, 35062, 36608, 37431, 38640, 39130, 40218, 41297, 42903, 43804, 44240, 44673, 45264, 46228, 47091, 47908, 48858, 49571, 50019, 50381, 51181, 52015, 52939, 53703, 54428, 54861, 55526, 56310, 57104, 58188, 59671, 60573, 61075, 61464, 62247, 63289, 64105, 65405, 66247, 67121, 67643, 67965, 68513, 69466, 70578, 71755, 72257, 72652, 73404, 74106, 74859, 75735, 76195, 76345, 76661, 77230, 77954, 78580, 79333, 79863, 80085, 80538, 81017, 81847, 82441, 83040, 83445, 83729, 84172, 84846, 85423, 85938, 86566, 87236, 87392, 87774, 88462, 89077, 89711, 90420, 91166, 91340, 92044, 93003, 93770, 94576, 95499, 96130, 96471, 96840, 97639, 98178, 99351, 100311, 101313, 101707, 102095, 103004, 104108, 105217, 106169, 107198, 107735, 108171, 109465, 110703, 111813, 112928, 114137, 114630, 115114, 116822, 118412, 119431, 120894, 121956, 122522, 123161, 124586, 125723, 127013, 128853, 129908, 130517, 131107, 132538, 133436, 134717, 136144];
    const newNumberTests = numberTests.map((entry, index) => [null, undefined].includes(numberTests[index - 1]) === false ? entry - numberTests[index - 1] : entry);

    // number of tested people
    const numberTestedPeople = [1087, 1249, 1524, 1995, 2504, 3094, 3501, 3777, 4008, 4292, 4507, 4889, 5215, 5509, 5994, 6254, 6530, 6812, 7082, 7541, 8040, 8338, 8819, 9302, 9752, 10294, 10712, 11265, 11677, 12044, 12194, 12551, 12962, 13515, 13977, 14783, 15089, 15405, 15736, 16442, 17024, 17573, 17895, 18423, 18567, 18844, 19178, 19705, 20036, 20166, 20333, 20561, 20872, 21284, 21572, 21969, 22265, 22500, 22731, 23120, 23487, 23969, 24316, 24677, 24930, 25263, 25601, 25999, 26585, 27549, 27938, 28189, 28401, 28809, 29251, 29680, 30308, 30790, 31254, 31610, 31800, 32135, 32665, 33291, 33944, 34307, 34607, 35148, 35553, 35974, 36393, 36607, 36698, 36931, 37210, 37563, 37858, 38276, 38519, 38636, 38949, 39241, 39601, 39893, 40235, 40487, 40655, 40961, 41389, 41686, 42017, 42385, 42772, 42875, 43059, 43534, 43847, 44223, 44844, 45318, 45433, 46009, 46587, 47161, 47745, 48340, 48617, 48867, 49079, 49628, 49882, 50667, 51322, 51844, 52154, 52364, 52913, 53491, 54206, 54775, 55385, 55757, 56024, 56638, 57346, 57987, 58633, 59260, 59515, 59794, 60696, 61905, 62599, 63420, 63890, 64243, 64618, 65438, 66156, 66986, 68151, 68769, 69119, 69465, 70275, 70742, 71480, 72200];
    const newNumberTestedPeople = numberTestedPeople.map((entry, index) => [null, undefined].includes(numberTestedPeople[index - 1]) === false ? entry - numberTestedPeople[index - 1] : entry);

    return {
      dates,

      positiveTested,
      newPositiveTested,

      currentlyPositiveTested,
      newCurrentlyPositiveTested,

      cured,
      newCured,

      deceased,
      newDeceased,

      numberTests,
      newNumberTests,

      numberTestedPeople,
      newNumberTestedPeople
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
        result += data.newDeceased[index] + ",";
        result += data.numberTests[index] + ",";
        result += data.newNumberTests[index] + ",";
        result += data.numberTestedPeople[index] + ",";
        result += data.newNumberTestedPeople[index] + "\r\n"
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
          numberTests: data.numberTests[index],
          newNumberTests: data.newNumberTests[index],
          numberTestedPeople: data.numberTestedPeople[index],
          newNumberTestedPeople: data.newNumberTestedPeople[index]
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
