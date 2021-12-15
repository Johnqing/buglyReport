const request = require('request');
const puppeteer = require('puppeteer');
const appConfig = require('./config');

const loginUrl = `https://bugly.qq.com/v2/workbench/apps`;

const flag = false;

(async () => {
  const browser = await puppeteer.launch({
    // headless: false,
    // devtools: true,
    args: [
      '--disable-web-security'
    ]
  });
  const page = await browser.newPage();
  
  
  await page.goto(loginUrl, {
    timeout: 0
  });

  page.on('response', async (res) => {
    const status = res.status();
    const headers = res.headers();
    
    if(flag || (headers['content-type'] && headers['content-type'].indexOf('text/htm') === -1) || (status >= 300 && status <= 399)){
      return;
    }
    
    const url = await page.url();
    if(url.indexOf('https://bugly.qq.com/') !== -1){
      //
      const getCrashData = async () => {
        return await page.evaluate(async () => {
          const getProjectInfo = async () => {
            
            const data = await fetch(`
            https://bugly.qq.com/v4/api/old/app-list?userId=625A951BEBAE19D6DC0FBFBC34A79B7B&fsn=b2118c7f-e47d-4e13-bb9a-cd985bda106a
            `, {
              headers: {
              'Content-Type': 'application/json'
              }
            })
            .then((response) => {
              return response.json()
            })
            return data.data
          }
          // 
          const getAppInfo = async (config) => {
            const data = await fetch(`
            https://bugly.qq.com/v4/api/old/get-app-info?appId=${config.appId}&pid=${config.pid}&types=version,member,tag,channel&fsn=${config.fsn}
            `, {
              headers: {
              'Content-Type': 'application/json'
              }
            })
            .then((response) => {
              return response.json()
            })

            const res = data.data;
            const list = res.versionList.filter((v) => {
              return !/[a-z]/.test(v.name)
            });

            const v = list[0].name;
            const v1 = list[1].name;
            return {
              v: v,
              v1:v1
            };
          }

          const getCrash = async (config) => {
            const currTime = new Date().getTime();
            //时间戳转换方法    date:时间戳数字
            function formatDate(d) {
              let date = new Date(d);
              let YY = date.getFullYear() + '-';
              let MM = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
              let DD = (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate());

              let dateString =  YY + MM + DD;
              dateString = dateString.replace(/-/g, '');
              return dateString;
            }

            function getBeforeDate(d, num){
              const _date = new Date(d);
              _date.setDate(_date.getDate() - num);
              return formatDate(_date);
            }

            const endDate = getBeforeDate(currTime, 1);
            const startDate = getBeforeDate(currTime, 7);

            const data = await fetch(`
            https://bugly.qq.com/v4/api/old/get-crash-trend?appId=${config.appId}&pid=${config.pid}&type=crash&dataType=trendData&startDate=${startDate}&endDate=${endDate}&version=${config.version}&fsn=${config.fsn}
            `, {
              headers: {
              'Content-Type': 'application/json'
              }
            })
            .then((response) => {
              return response.json()
            })
            const res = data.data.data;
            if(!res){
              return;
            }
            const now = res.pop();
            const before = res.pop();
            let nowCrash = (now.crashNum/now.accessNum*100).toFixed(2);
            nowCrash = nowCrash == 100 || nowCrash < 0 ? 0 : nowCrash;
            let beforeCrash = (before.crashNum/before.accessNum*100).toFixed(2);
            beforeCrash = beforeCrash == 100 || beforeCrash < 0 ? 0 : beforeCrash;
            
            const version = config.version.match(/(\d+)\.(\d+)\.(\d+)/);;
            return {
              version: version[0],
              nowCrash,
              beforeCrash
            }
          }
          const projectInfo = await getProjectInfo();
          console.log('[getProjectInfo]', projectInfo);

          const _data = [];

          for(let i=0; i<projectInfo.length; i++){
            let project = projectInfo[i];
            let config = {
              appId: project.appId,
              pid: project.pid,
              fsn: 'f6e7f25f-7427-4699-92c0-3c5e1029b074',
            }
           
            console.log('[getAppInfo]');
            const versionMaps = await getAppInfo(config);
            
            console.log('[getCrash]');
            const crashV = await getCrash({
              ...config,
              version: versionMaps.v
            });

            console.log('[getCrash]');
            const crashV1 = await getCrash({
              ...config,
              version: versionMaps.v1
            });
            _data.push({
              name: project.appName,
              v: crashV,
              v1: crashV1
            })
          }

          return _data
        });
      }

      if(url.indexOf('`https://bugly.qq.com/v4/api/old/get-crash-trend') !== -1){
        console.log('[BUGLY]', '#getCrashData', url, 'fetch')
        return;
      }

      let crashData = await getCrashData();
      console.log('[getCrashData]', crashData);

      crashData = crashData.map((data) => {
        const current = data.v;
        const pre = data.v1;
        return {
          "tag": "text",
          "text": `${data.name}\n[${current.version}]今日：${current.nowCrash}，前一日：${current.beforeCrash}\n[${pre.version}]今日：${pre.nowCrash}，前一日：${pre.beforeCrash}\n`
        }
      })

      console.log('[getCrash]', crashData);
     
      const options = {
        url: appConfig.feishu.bugly,
        method: 'POST',
        headers: {
          'Content-Type':'application/json'
        },
        body: JSON.stringify({
          msg_type: 'post',
          content: {
            post: {
              "zh-cn": {
                title: '崩溃提率醒',
                "content": [crashData]
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

      browser.close();
    }
  
    await page.evaluate((qq) => {
      const iWindow = document.getElementById('ptlogin_iframe').contentWindow;
      const doc = iWindow.document;
      doc.querySelector('#switcher_plogin').click()
      
      doc.querySelector('#u').value = qq.user;
      doc.querySelector('#p').value = qq.password;
  
      doc.querySelector('#login_button').click();
    }, appConfig.qq);

    console.log('[LOGIN]', 'Success')
  })
})();
