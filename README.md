# Centrecom RTX 3080 Stock Tracker

A simple 30 minute serverless scraper to alert us about RTX 3080 stock

## Description

This bot is designed to scrape Centrecom for RTX 3080 stock and post it into a Slack channel.

## Getting Started

### Dependencies

* serverless
* axios
* cheerio
* Slack

### Installing

* Create a Slack bot with a webhook URL.
* Create an `.env` file and fill them with
    TABLE_NAME=centrecom-products
    PK=product
    SLACK_URL=X
* Run `npm install --prod` to install dependencies.
* Run `sls offline` to run locally.
* Run `sls deploy` to deploy to AWS.
