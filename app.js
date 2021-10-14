'use strict';

const express = require('express');
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 3000;

/// MQTT の処理 ////////////////////////////////////////////////////

const mqtt = require('mqtt');

// 今回使う CloudMQTT のブローカーアドレス
const clientMQTTAddress = 'CloudMQTT のブローカーアドレス'

// 今回使う CloudMQTT のポート番号
const clientMQTTPort = 1883;

// 今回使う CloudMQTT のユーザー名
const clientMQTTUserName = 'CloudMQTT のユーザー名';

// 今回使う CloudMQTT のパスワード
const clientMQTTPassword = 'CloudMQTT のパスワード';

// MQTT ライブラリから接続
let clientMQTT  = mqtt.connect(clientMQTTAddress,
  {
    port:clientMQTTPort,
    username:clientMQTTUserName,
    password:clientMQTTPassword
  }
);

clientMQTT.on('connect', function () {
  // 接続時にログ
  console.log('MQTT Connected!');
  // 起動時に MQTT メッセージを送ります
  clientMQTT.publish('/dhw/pp2/mqtt/student/allMessage', 'Hello MQTT LINE BOT!');
})

/// LINE BOT の処理 //////////////////////////////////////

// 作成したBOTのチャンネルシークレットとチャンネルアクセストークン
const config = {
  channelSecret: '作成したBOTのチャンネルシークレット',
  channelAccessToken: '作成したBOTのチャンネルアクセストークン'
};

// プッシュメッセージで受け取る宛先となる作成したBOTのユーザーID'
const userId = '作成したBOTのユーザーID';

const app = express();

// M5Stack からJSON データを受け取ったときに扱えるようにする設定
// https://qiita.com/kmats/items/2c2502cfa3a633e7e049
app.use('/from/m5stack', express.json()); 

app.get('/', (req, res) => res.send('Hello LINE BOT!(GET)')); //ブラウザ確認用(無くても問題ない)
app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);

    //ここのif分はdeveloper consoleの"接続確認"用なので削除して問題ないです。
    if(req.body.events[0].replyToken === '00000000000000000000000000000000' && req.body.events[1].replyToken === 'ffffffffffffffffffffffffffffffff'){
        res.send('Hello LINE BOT!(POST)');
        console.log('疎通確認用');
        return; 
    }

    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result));
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // M5Stack にも MQTT メッセージを送ります
  clientMQTT.publish('/dhw/pp2/mqtt/YOURNAME/subscribe', 'Hello MQTT LINE BOT!');

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: event.message.text //実際に返信の言葉を入れる箇所
  });
}

// M5Stack からメッセージを受け取り LINE BOT へプッシュメッセージする部分 MQTT
clientMQTT.on('message', function (topic, message) {
  // message が Buffer データで来ているので文字列化する
  const messageString = message.toString();
  console.log('M5Stack からメッセージを受け取り MQTT');
  console.log(messageString)
  // さらに JSON 化する
  const messageJson = JSON.parse(messageString);
  // 受信した JSON データの message 値を LINE BOT へプッシュする
  const pushText = messageJson.message;
  // LINE にメッセージを送る
  client.pushMessage(userId, {
    type: 'text',
    text: pushText,
  });
})

/*
// M5Stack からメッセージを受け取り LINE BOT へプッシュメッセージする部分 HTTP
app.post('/from/m5stack', async function(req, res){

  console.log('M5Stack からメッセージを受け取り');
  console.log(req.body);

  const pushText = req.body.message;  // 受信した JSON データの message 値を LINE BOT へプッシュする

  client.pushMessage(userId, {
    type: 'text',
    text: pushText,
  });

  res.send('Hello M5Stack!(POST)');
});
*/

app.listen(PORT);

console.log(`Server running at ${PORT}`);