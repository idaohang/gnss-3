var env = process.argv[2] || process.env.NODE_ENV || 'development';
var config = require('./config')[env];

var multer = require('multer'); // v1.0.5
var path = require('path');
var cwd = config.cwd;

var upload = multer({dest:cwd+ '/uploads/'}); // for parsing multipart/form-data，
var StationConfig = require('../data/stationConfig.js');

var fs = require('fs');
var readLine = require('linebyline');

var parse=require('../canavprocess/follow_process.js');
var os=require('os');

module.exports = function (app) {
    app.post('/logs', upload.single('log_file'), function (req, res, next) {
        console.lg('/--------------get log')
        var logPath = config.logPath.toString() + req.file.originalname;
        var logResolvePath = cwd+logPath;
        var name = fs.rename(req.file.path, logResolvePath);
        getStaData(cwd,logResolvePath,logPath);
        fs.readdir(cwd+"/logs", function (err, files) {
            if (err) {
                return
            }
            files.forEach(function (fileName) {
                var startDate = fileName.slice(-10);
                var endDate = req.file.originalname.slice(-10);
                var resultDays = GetDateDiff(startDate, endDate, "day");
                if (resultDays > 180) {
                    fs.unlink(cwd+"/logs" + '/' + fileName, function (err) {
                        if (err) throw err;
                    })//删除logs
                }
            })

        })
        fs.readdir(cwd+"/data", function (err, files) {
            if (err) {
                return
            }
            files.forEach(function (fileName) {
                var startDate = fileName.slice(-10);
                var endDate = req.file.originalname.slice(-10);
                var resultDays = GetDateDiff(startDate, endDate, "day");//半年删除一次log,data
                if (resultDays > 180) {
                    fs.unlink(cwd+"/data" + '/' + fileName, function (err) {
                        if (err) throw err;
                    })//删除data
                }
            })

        })

        console.log(req.file.path);

        res.send("ok");
    });
};
//getStaData('./logs/shanghai-dev.log-2017-03-14');

//getStaData(cwd,cwd+"/logs/beijing-thu.log-2017-06-12","./logs/beijing-thu.log-2017-06-12")

function getStaData(cwd,logResolvePath,log_path) {
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
        fs.writeFile(dataPath, buff,function () {
            console.log('-------------------------------------------ok')

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



function followProcess(cwd, dataPath, stationId){
    var stream;
    var len=300;
    var maxLen=400;
    var followDataPath = cwd + '/followData/' + dataPath.split('/').pop();
    var fileName = followDataPath.split('/').pop();
    var timeInfo = fileName.replace("data-",'');
    var startTime;
    var endTime;
    var now = new Date(timeInfo);
    startTime = [
            now.getYear() + 1900,
            now.getMonth(),
            now.getDate(), 0, 0, 0
    ];
    endTime =  [
        now.getYear() + 1900,
        now.getMonth(),
        now.getDate(), 23, 59, 59
    ];

    //
    StationConfig.findByStaId(stationId).then(function(result){

        if(result.status){
            stream = fs.createReadStream(dataPath);
            parse.procinit(stationId, startTime, endTime ,maxLen, result.stationConfig.config);
            var fwrite=fs.createWriteStream(followDataPath);
            stream.on('readable',function () {
                var data;
                while (null != (data = stream.read(len))) {
                    var logpos=parse.parser_pos(data);
                    logpos.forEach(function (log) {
                        var obj={"time":log.time,"data":log.posR};
                        fwrite.write(JSON.stringify(obj)+os.EOL);
                    });
                }
            });
            stream.on("end",function () {
                console.log('the file process end');
            });
            stream.on("close", function () {
                console.log('the file process close');
                fwrite.close();
                process.emit(1);
            });
        }
    });


    /*stream.on('data',function (data) {
     //console.log('data event is strigger');
     parse.datatype(sta_id,data);
     });*/

}
//followProcess(cwd,cwd+"/data/beijing-thu.data-2017-06-11",2);
