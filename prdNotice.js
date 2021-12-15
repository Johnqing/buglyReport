const request = require('request');
const appConfig = require('./config');

const options = {
    url: appConfig.feishu.prd,
    method: 'POST',
    headers: {
      'Content-Type':'application/json'
    },
    body: JSON.stringify({
      msg_type: 'post',
      content: {
        post: {
          "zh-cn": {
            title: '需求准备好了么？',
            "content": [
                [
                    {
                      "tag": "at",
                      "user_id": "all",
                      "user_name": "所有人"
                    },
                    {
                      "tag": "text",
                      "text": `Hi，everybody
明天是App组评审，有需求要进下个Sprint的，请提前在“需求池”列表准备任务卡片

评审时间和地点如下：
- 15:00 一层-赫尔墨斯(16) 6D

TB地址：
https://www.teambition.com/project/60b609e81978dd4bf7a4830f/story/view/60b60a0ce903b200447d09ef`
                    }
                ]
            ]
          }
        }
      }
    })
  }

  console.log('[feishu]', options)
  request(options, (err, res, body) => {
    if(err){
      console.log('[feishu]', err);
      return;
    }
    console.log('[feishu]', body);
  })