'use strict';
const {default: axios} = require('axios');
const cheerio = require('cheerio');
const DynamoDB = require('aws-sdk/clients/dynamodb');

const dynamo = () => {
  const PRODUCT = 'rtx3080';

  const dynamodb = new DynamoDB.DocumentClient(
    process.env.IS_OFFLINE ? {
      endpoint: 'http://localhost:8000',
      region: 'localhost',
      accessKeyId: 'DEFAULT_ACCESS_KEY',
      secretAccessKey: 'DEFAULT_SECRET',
    } : {},
  );

  const loadProducts = async () => {
    const params = {
      TableName: process.env.TABLE_NAME,
      Key: {
        [process.env.PK]: PRODUCT
      }
    }
   return dynamodb.get(params).promise();
  }

  const updateProducts = async (products) => {
    const params = {
      TableName: process.env.TABLE_NAME,
      Item: {
        [process.env.PK]: PRODUCT,
        items: products
      }
    }
    return dynamodb.put(params).promise();
  }

  return {
    loadProducts,
    updateProducts
  }
}

module.exports.handler = async event => {
  const db = dynamo();
  const agent = axios.create({
    baseURL: "https://www.centrecom.com.au/nvidia-2?orderby=11&pagesize=16"
  });

  const res = await agent.get('/').catch(error => {
    console.error(error);
    throw error;
  });

  const $ = cheerio.load(res.data);

  const PRODUCT_DIV_CLASS = '.prbox_link';
  const PRODUCT_NAME_DIV_CLASS = '.prbox_name';
  const PRODUCT_PRICE_DIV_CLASS = '.saleprice';
  const PRODUCT_IN_STOCK = '.prbox_green';

  const instockProducts = [];
  $(PRODUCT_DIV_CLASS).each((i, e) => {
    const href = e.attribs.href;
    const name = $(e).find(PRODUCT_NAME_DIV_CLASS).text();
    const price = $(e).find(PRODUCT_PRICE_DIV_CLASS).text();
    const instock = $(e).find(PRODUCT_IN_STOCK).text();
    if (href.includes('3080') && instock){
      instockProducts.push({
        url: 'https://www.centrecom.com.au' + href,
        online: instock.includes('Available online'),
        name,
        price,
      });
    }
  });

  if (instockProducts.length) {
    const productsLoad = await db.loadProducts();
    const dbProducts = (productsLoad.Item && productsLoad.Item.items) || [];
    const newProducts = instockProducts.filter(i => !dbProducts.some(p => p.url === i.url))
 
    await Promise.all(newProducts.map(async (p) => {
      const stockLocation = p.online ? 'Online' : 'Instore';
      const text = `${stockLocation}: ${p.name} - ${p.price}` + '\n' + p.url
      return axios.post(process.env.SLACK_URL, { text });
    }));

    //Something went out of stock or there was new stock store state to avoid a future notification.
    if(instockProducts.length !== dbProducts.length || newProducts.length){
      await db.updateProducts(instockProducts.map(p => ({url: p.url})));
    }
  }

  return {}
};