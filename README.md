# COVID-19 South Tyrol API
![Deployment](https://github.com/ivansieder/corona-bz-api/workflows/lambda-deploy/badge.svg)
#### Disclaimer: inofficial ¯\\_(ツ)_/¯

Visualization: [chart.corona-bz.simedia.cloud](https://chart.corona-bz.simedia.cloud)

Scrapes the data from [http://www.provinz.bz.it/sicherheit-zivilschutz/zivilschutz/aktuelle-daten-zum-coronavirus.asp](http://www.provinz.bz.it/sicherheit-zivilschutz/zivilschutz/aktuelle-daten-zum-coronavirus.asp), so let's hope they never change the structure so it continues to work. However, if it doesn't work anymore, please just write me [ivan@sieder.xyz](mailto:ivan@sieder.xyz) or even better: open a github issue.

The data from the number of tests and number of tested people has been manually added from each press release.

## Links
JSON: [http://api.corona-bz.simedia.cloud/?format=json](http://api.corona-bz.simedia.cloud/?format=json)

CSV: [http://api.corona-bz.simedia.cloud/?format=csv](http://api.corona-bz.simedia.cloud/?format=csv)

## Changelog
### 2020-11-03
- added quarantinedPeople (amount of people in quarantine)
- added newQuarantinedPeople (amount of new quarantined people since the day before)

### 2020-10-17
- added numberHospitalizedPeople (amount of hospitalized people)
- added newNumberHospitalizedPeople (amount of new hospitalized people since the day before)
- added numberIntensiveTherapy (amount of people in intensive therapy)
- added newNumberIntensiveTherapy (amount of new people in intensive therapy since the day before)

### 2020-10-16
- added sevenDaysAveragePositiveTested (7-day-average of positive tested)
- added sevenDaysAverageNumberTests (7-day-average of number of tests)
- added sevenDaysAverageNumberTestedPeople (7-day-average of number of tested people)