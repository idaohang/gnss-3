var env = process.argv[2] || process.env.NODE_ENV || 'development';

var multer = require('multer'); // v1.0.5
var path = require('path');
var fs = require('fs');
var os = require('os');
var lock = require('lockfile');
var readLine = require('linebyline')


var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = 'mongodb://localhost:27017/wang'; //数据库名为wang


var cwd="/home/lulu";
// var logResolvePath="/home/lulu/logs/beijing-thu.log-2017-06-07";
// var logPath="/logs/beijing-thu.log-2017-07"


var insertData=function (db,filter,cb) {
    var collection=db.collection('stationconfigs');
    collection.find(filter).toArray(function (err,result) {
        if(err){
            console.log(err)
            return
        }
        cb(result)
    })
}
function getMongosData(filter,cb) {
    MongoClient.connect(DB_CONN_STR,function (err,db) {
        console.log('连接成功')
        insertData(db,filter,function (result) {
            db.close();
            cb(result)
        })

    })
}
//获取数据库数据

function addLogResolve(cwd, logResolvePath, logPath,cb) {
    lock.lock('logRecord.lock',{wait:100,retries:1,retryWait:100} ,function (err) {
        if (err) return cb({status: false})
        var logRecord = getLogRecord();
        logRecord.infos.push({'cwd': cwd, 'logResolvePath': logResolvePath, 'logPath': logPath});
        fs.writeFileSync('logRecord.json', JSON.stringify(logRecord))
        lock.unlock('logRecord.lock',function(err){
            if(err) return
            cb({status: true})
        })

    })

}


function saveStartLog(isHandle) {
    var logRecord = getLogRecord();
    logRecord.status = isHandle;
    var info;
    if (isHandle) {
        info = logRecord.infos.pop()

    }

    lock.lock('firstLogRecord.lock',{wait:100,retries:1,retryWait:100},function (err) {
        if (err) return
        fs.writeFileSync('logRecord.json', JSON.stringify(logRecord))
        lock.unlock('firstLogRecord.lock',function (err) {
        })
    })
    // return !isHandle? null  : logRecord.infos[logRecord.infos.length-1]

    return info
}

function getLogRecord() {
    try {
        return JSON.parse(fs.readFileSync('logRecord.json', {flag: 'r+', encoding: 'utf8'}))


    } catch (err) {

        return {"status": false, "infos": []}
    }


}
// var file=JSON.parse(fs.readFileSync("./logRecord.json",{flag: 'r+', encoding: 'utf8'}))
// file.infos.forEach(function (path) {
//     addLogResolve("/home/lulu", path.logResolvePath,path.logPath,function(result){
//
//                 if(result.status){
//                  console.log('ok')
//                 }
//
//
//             })
// })


startHandleLogFile()

function startHandleLogFile() {
    // saveStartLog(false)
    handleLogFile()
    setInterval(function () {
        handleLogFile()
    }, 1000*60*2)
}

function handleLogFile() {
    var logRecord = getLogRecord();
    if (logRecord.status)  return;
    var info = saveStartLog(true)
    if (info) {
        removeOverTimeDate(info.logPath.split('/').pop())
        console.log(info.cwd+ '=-======='+info.logResolvePath+ '=-======='+info.logPath)

        getStaData(info.cwd, info.logResolvePath, info.logPath, function () {
            console.log("+++++")
            saveStartLog(false)
        })

    }

}

// removeOverTimeDate(req.file.originalname)


function removeOverTimeDate(originalname) {
    fs.readdir(cwd + "/logs", function (err, files) {
        if (err) {
            return
        }
        files.forEach(function (fileName) {
            var startDate = fileName.slice(-10);
            var endDate = originalname.slice(-10);//todo
            var resultDays = GetDateDiff(startDate, endDate, "day");
            if (resultDays > 180) {
                fs.unlink(cwd + "/logs" + '/' + fileName, function (err) {
                    if (err) throw err;
                })//删除logs
            }
        })

    })
    fs.readdir(cwd + "/data", function (err, files) {
        if (err) {
            return
        }
        files.forEach(function (fileName) {
            var startDate = fileName.slice(-10);
            var endDate = originalname.slice(-10); //todo
            var resultDays = GetDateDiff(startDate, endDate, "day");//半年删除一次log,data
            if (resultDays > 180) {
                fs.unlink(cwd + "/data" + '/' + fileName, function (err) {
                    if (err) throw err;
                })//删除data
            }
        })

    })


}
//getStaData('./logs/shanghai-dev.log-2017-03-14');

//getStaData(cwd,cwd+"/logs/beijing-thu.log-2017-06-12","./logs/beijing-thu.log-2017-06-12")

function getStaData(cwd, logResolvePath, log_path, cb) {
    var dataPath = cwd + '/data/' + log_path.split('/').pop().replace('log-', 'data-');
    var allData = [];
    var rl = readLine(logResolvePath);
    rl.on('line', function (line, idx) {
        var send = line.replace(/" "/g, "").replace(/:/g, "");
        var sendInfo = send.split("'");
        if (sendInfo[0].indexOf('data') > -1) {
            var info = sendInfo[1];
            var data = Buffer.from(info, 'base64');
            allData.push(data)
        }
    });
    rl.on('end', function () {
        var buff = Buffer.concat(allData);
        fs.writeFile(dataPath, buff, function () {
            console.log('-------------------------------------------ok')
            followProcess(cwd, dataPath, cb)

        });
    });

}

function GetDateDiff(startTime, endTime, diffType) {
    startTime = startTime.replace(/\-/g, "/");
    endTime = endTime.replace(/\-/g, "/");

    diffType = diffType.toLowerCase();
    var sTime = new Date(startTime);
    var eTime = new Date(endTime);  //结束时间
    //作为除数的数字
    var divNum = 1;
    switch (diffType) {
        case "second":
            divNum = 1000;
            break;
        case "minute":
            divNum = 1000 * 60;
            break;
        case "hour":
            divNum = 1000 * 3600;
            break;
        case "day":
            divNum = 1000 * 3600 * 24;
            break;
        default:
            break;
    }
    return parseInt((eTime.getTime() - sTime.getTime()) / parseInt(divNum));
}


function followProcess(cwd, dataPath, cb) {
    var stream;
    var len = 300;
    var maxLen = 400;
    var followDataPath = cwd + '/followData/' + dataPath.split('/').pop();
    var fileName = followDataPath.split('/').pop();
    var stationId = fileName.split('.data-')[0];
    var timeInfo = fileName.split('.data-')[1];
    var startTime;
    var endTime;
    var now = new Date(timeInfo);
    startTime = [
        now.getYear() + 1900,
        now.getMonth(),
        now.getDate(), 0, 0, 0
    ];
    endTime = [
        now.getYear() + 1900,
        now.getMonth(),
        now.getDate(), 23, 59, 59
    ];

    //
    function findByStaId(staId,cb) {

        getMongosData({staId: staId},function (result) {
            // console.log(result)
            // result.findOne().exec(function (err, stationConfig) {
            if (!result[0]) {
                cb({status: false})
            }
            cb({status: true, stationConfig: result[0]})

            // });


        })

    }

    findByStaId(stationId,function (result) {
        var parse = require('../canavprocess/follow_process.js');

        if (result.status) {
            stream = fs.createReadStream(dataPath);
            parse.procinit(stationId, startTime, endTime, maxLen, result.stationConfig.config);
            var fwrite = fs.createWriteStream(followDataPath);
            stream.on('readable', function () {
                var data;
                while (null != (data = stream.read(len))) {
                    var logpos = parse.parser_pos(data);
                    // console.log('------------------')
                    logpos.forEach(function (log) {
                        var obj = {"time": log.time, "data": log.posR};
                        fwrite.write(JSON.stringify(obj) + os.EOL);
                    });
                }
            });
            stream.on("end", function () {
                console.log('the file process end');
            });
            stream.on("close", function () {
                console.log('the file process close');
                fwrite.close();
                cb()
            });
        }
    })

}

