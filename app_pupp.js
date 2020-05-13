const axios = require('axios').default;
const cheerio = require('cheerio');
var fs = require('fs');
const xlsx = require('xlsx');
const sleep = require('sleep-promise');
const puppeteer = require('puppeteer');


let counter = 0;
let url = 'http://phonedb.net/index.php?m=device&s=list&order_field=released_ts&filter=';

const pattern = 'PhoneDB_Test_';
var fileNumber = (fs.readdirSync('./collected/').length) + 1;

var filePath = `./collected/${pattern}${fileNumber}.xlsx`;

let devices = [];
let deviceLinks = []
const workBook = xlsx.utils.book_new();
let allDevicesSheet = xlsx.utils.json_to_sheet(devices);
xlsx.utils.book_append_sheet(workBook, allDevicesSheet, 'All Devices');

allDevicesSheet["!cols"] = [{ width: 25 }];

(async () => {
    console.log("\x1b[36m", "--- PhoneDB Scraper Started ---")
    const browser = await puppeteer.launch({
        "headless": false,
        "args": ["--fast-start", "--disable-extensions", "--no-sandbox"],
        "ignoreHTTPSErrors": true
    });
    const page = await browser.newPage()
    try {
        for (let i = 0; i <= 29; i = i + 29) {

            await sleep(Math.floor((Math.random() * (10 - 5 + 1)) + 5) * 1000);
            await page.goto(`${url}${i}`, { waitUntil: 'domcontentloaded' });
            await page.waitFor(5000);

            let html = await page.evaluate((type) => {
                return document.body.innerHTML;
            });

            let $ = cheerio.load(html);

            if ($('div.content_block').find('a').length > 0) {

                $('div.content_block').find('div.content_block_title').find('a').each((j, el) => {
                    //console.log(i + ' : '+ $(el).attr('href'))
                    deviceLinks.push('http://phonedb.net/' + $(el).attr('href'))
                })

                console.log(deviceLinks)

                for (let k = 0; k < deviceLinks.length; k++) {
                    await sleep(Math.floor((Math.random() * (5 - 1 + 1)) + 1) * 1000);

                    await page.goto(deviceLinks[k])
                    await page.waitFor('body');

                    counter++
                    console.log("\x1b[32m", `#${counter}: Link >> ${deviceLinks[k]}`);

                    let html = await page.evaluate((type) => {
                        return document.body.innerHTML;
                    });

                    $ = cheerio.load(html)

                    let Device = new Object();
                    Device['Name'] = $('div.sidebar').find('h1').eq(0).text().trim();
                    let specs = [];

                    $('div.canvas').find('table').eq(0).find('tbody').find('tr').each((x, el) => {
                        specs.push($(el))
                    })

                    for (let y = 0; y < specs.length; y++) {

                        if (specs[y].find('td').length == 2) {
                            var key = specs[y].find('td').eq(0).text().trim().replace(/ /g, '_');
                            if (key == '') {
                                key = specs[y - 1].find('td').eq(0).text().trim().replace(/ /g, '_');
                                if (key == '') {
                                    key = specs[y - 2].find('td').eq(0).text().trim().replace(/ /g, '_');
                                }
                            }
                            var value = specs[y].find('td').eq(1).text().trim()
                            if (key in Device) {
                                Device[key] = Device[key] + '; ' + value
                            }
                            else {
                                Device[key] = value;
                            }
                        }

                    }

                    devices.push(Device);

                }

            }

            if (counter % 29 == 0) {
                await saveToFile();
            }
        }
        
        await saveToFile();
        console.log("\x1b[32m", "--- Completed ---");
        process.exit();
    }
    catch (err) {
        console.log(err);
    }

})();


const saveToFile = async () => {
    console.log("\x1b[36m", 'Saved to the file');
    xlsx.utils.sheet_add_json(allDevicesSheet, devices);
    await xlsx.writeFile(workBook, filePath);
}



process.on('SIGINT', function () {
    console.log("\x1b[33m", "Caught interrupt signal. Saving to the file...");
    saveToFile();
    process.exit();
});