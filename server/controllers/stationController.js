var fs = require('fs');
var path = require('path');
var StationSocketStatus = require('../config/messagequeue')
var batchProcessData = require('../batch_process_data/batch_process_data');
var encryption = require('../utilities/cripto'),
    UserStationId = require('../data/userStationId'),
    StationStatus = require('../data/stationStatus'),
    StaThreshold = require('../data/staThreshold'),
    Station = require('../data/station'),
    BatchProcess = require('../data/batchProcess');
    UsersData = require('../data/usersData');


function checkUserStationId(userStationId, userStationInfo) {
    var defer = Promise.defer();
    Station.find({name: userStationId[userStationInfo[0][0]], staId: userStationId[userStationInfo[1][0]]})
        .then(function (station) {
            if (!station) {
                userStationId[userStationInfo[0][0]] = userStationInfo[0][1];
                userStationId[userStationInfo[1][0]] = userStationInfo[1][1]
                userStationId.save(function (err, userStationId) {
                    defer.resolve(userStationId)
                })
            } else {
                return defer.resolve(userStationId)
            }
        });
    return defer.promise;
}
function getUserStationId(req, res) {
    UserStationId.findStaIdByName(req.user.username, function (err, userStationId) {
        if (err) {
            return res.send({status: false, message: 'getUserStationId error  '})
        }
        //console.log(req.user)
        Station.all().then(function (stations) {
            if (stations[0] == null) {
                var station = {
                    userStation: {userName: req.user.username},
                    allStation: []
                }
                return res.send(station)
            }
            var username, stationid
            for (var i = 0; i < stations.length; i++) {
                if (stations[i].staId == req.user.station) {
                    username = stations[i].name;
                    stationid = stations[i].staId;
                    break;
                }
            }
            var stationInfo = [
                ['staName', username],
                ['staId', stationid]
            ]
            checkUserStationId(userStationId, stationInfo)
                .then(function (userStationId) {
                    var startBaseStationInfo = [
                        ['startBaseStation', username],
                        ['startStaId', stationid]
                    ];
                    checkUserStationId(userStationId, startBaseStationInfo)
                        .then(function (userStationId) {
                            if (req.user.roles.length == 1) {
                                var userStation = JSON.parse(JSON.stringify(userStationId));
                                userStation.name = username
                                //console.log(userStation)
                                var station = {
                                    userStation: userStation,//普通用户发一个，管理员都发
                                    allStation: []
                                }
                                //console.log('user')

                                res.send(station)
                            }
                            else {
                                var station = {
                                    userStation: userStationId,//普通用户发一个，管理员都发
                                    allStation: stations
                                }
                                res.send(station)
                            }
                        })

                })


        })
    })
}
//往前端返回基站和基站名，下拉框数据来源
function updateStaId(req, res) {
    var condition = {
        userName: req.body.userName
    };
    var data = {
        staName: req.body.staName,
        staId: req.body.staId,
        signalType: req.body.signalType,
        signalTypeId: req.body.signalTypeId,
        startBaseStation: req.body.startBaseStation,
        startStaId: req.body.startStaId
    };
    UserStationId.update(condition, data, function (err, update_data) {
        if (err) {
            return res.send({status: false, message: 'updateStaId error'})
        }
        if (update_data.ok == 1) {
            res.send({status: true});
        } else {
            res.send({status: false, message: 'updateStaId false , value is 0'})
        }
    })
}
function getStationStatus(req, res, next) {
    var data = {station_id: parseInt(req.query.staId)};
    var limit = parseInt(req.query.limit);
    StationStatus.where(data, limit)

        .then(function (success_data) {
            var stationData = {};
            if (!(StationSocketStatus.StationSocketStatus[req.query.staId])) {
                stationData.StationSocketStatus = false;
            } else {
                var socketStatus = StationSocketStatus.StationSocketStatus[req.query.staId]
                stationData.StationSocketStatus = socketStatus;
            }
            stationData.stationData = success_data;
            res.send(stationData);
        }, function (error) {
            res.send({
                status: 400,
                message: error
            });
        })
}
function getStations(req, res) {
    Station.all().then(function (stations) {
        res.send(stations)
    }, function (error) {
        res.send({
            status: 400,
            message: error
        });
    })
}
function createStation(req, res) {
    var station = req.query;
    Station.create(station).then(function (data) {
        res.send(data)
    }, function () {
        res.send({
            status: 400,
            message: 'creat station error'
        });
    })
}
function deleteStation(req, res) {
    Station.deleteByName(req.body.name).then(function (result) {
        UserStationId.deleteUserStation(req.body.name).then(function (results) {
            UsersData.deleteUserStationList(req.body.staId).then(function (results) {
                StaThreshold.deleteUserStaThreshold(req.body.name).then(function (allResult) {
                    res.send(allResult)
                })
            })
        })
    }, function (error) {
        res.send({
            status: 400,
            message: error
        });
    })
}
function addStation(req, res) {
    Station.create(req.body).then(function (station) {
        res.send(station)
    }, function (error) {
        res.send({
            status: 400,
            message: error
        });
    })
}
function getUserStaThreshold(req, res) {
    StaThreshold.findStaThresholdByName(req.body.userName, req.body.staName).then(function (staThreshold) {
        var resStaThreshold = {
            userName: staThreshold.userName,
            staName: staThreshold.staName,
            staThreshold: staThreshold.staThreshold || {}
        };
        res.send(resStaThreshold)
    }, function (error) {
        res.send({
            status: 400,
            message: error
        });
    })
}
function setStaThreshold(req, res) {
    var userStaThreshold = {
        userName: req.body.username,
        staName: req.body.staName,
        staThreshold: req.body.Threshold
    };
    StaThreshold.setStaThreshold(userStaThreshold).then(function (data) {
        if (data['ok'] == 0) {
            res.send({
                status: false,
                message: 'creat station threshold false'
            })
        } else {
            res.send({
                status: true
            })
        }
    }, function (error) {
        res.send({
            status: 400,
            message: error
        });
    })
}


function getBatchProcessStatus(userBatchProcesStatus) {
    var currentTime = new Date();
    if (!userBatchProcesStatus || !(userBatchProcesStatus.status)) {
        return {status: false}
    }

    return {
        status: true,
        waitTime: (userBatchProcesStatus.effectiveTime * 1000) - (currentTime - userBatchProcesStatus.createTime)
    }
}
function setUserFindTime(req, res) {
    var postBody = req.body;
    BatchProcess.findBatchProcess(req.user.username).then(function (userBatchProcessStatus) {
        var userBatchProcessStatus = getBatchProcessStatus(userBatchProcessStatus)
        if (userBatchProcessStatus.status) {
            return res.send({
                status: 202,
                waitTime: parseInt(Number(userBatchProcessStatus.waitTime) / 1000) * 0.6,
                message: 'Continue wait'
            })
        }
        Station.findByStaId(postBody.sta_id)
            .then(function (station) {
                var effectiveTime = batchProcessData.getBatchProcessTime(station.stationName, postBody.allDate)
                if (effectiveTime == 0) {
                    return res.send({status: 201, message: 'not have file'})
                }
                var usersTime = Object.keys(childInfo).length
                var waitTime = (parseInt(Number(effectiveTime) * (1 + usersTime * 0.3)) * 0.7);
                console.log(waitTime)
                saveUserFindStaData(effectiveTime, req.user.username).then(function () {
                    batchProcessDate(station.stationName, postBody, req.user.username)
                    res.send({status: 200, waitTime: waitTime, message: 'start wait'});
                });
            })
    })
}

function downloadStaData(req, res) {
    BatchProcess.findBatchProcess(req.user.username).then(function (batchProcesStatus) {
        if (!batchProcesStatus.status) {

            return res.download("./server/" + req.user.username + ".json")
        }
        console.log('----------------------------------------waitingDownload');
        return res.send({status: 202, message: 'wait'})
    })
}
function saveUserFindStaData(time, username) {
    var defer = Promise.defer();
    var condition = {
        effectiveTime: time,
        status: true,
        userName: username,
        createTime: new Date(),
        data: {}
    };
    BatchProcess.setBatchProcess(condition).then(function () {
        defer.resolve()
    });
    return defer.promise
}
function getUserFindStaData(req, res) {
    BatchProcess.findBatchProcess(req.user.username).then(function (batchProcesStatus) {
        if (!batchProcesStatus.status) {
            var integrity = batchProcesStatus.data.data.integrity;
            var a = {
                userName: batchProcesStatus.data.userName,
                data: {
                    availability: batchProcesStatus.data.data.availability,
                    continuity: batchProcesStatus.data.data.continuity,
                    integrity: integrity.slice(0, 10),
                    accuracy_95: batchProcesStatus.data.data.accuracy_95,
                    accuracy: batchProcesStatus.data.data.accuracy
                }

            }
            fs.writeFileSync("./server/" + req.user.username + ".json", JSON.stringify(batchProcesStatus.data.data.integrity));
            return res.send({status: 200, result: a})
        }
        console.log('----------------------------------------waiting')
        return res.send({status: 202, message: 'wait'})
    })
}
var childInfo = {}

function killChild(username) {
    if (childInfo[username] != undefined) {
        childInfo[username].kill()
    }
}
function batchProcessDate(station, filter, userName) {
    console.log(filter);
    console.log(station);
    console.log(userName);
    var child_process = require('child_process');
    var child = child_process.fork('./server/batch_process_data/batch_process_data.js');
    childInfo[userName] = child;
    child.on('message', function (batchProcessResult) {
        BatchProcess.findBatchProcess(batchProcessResult.userName).then(function (userBatchProcessStatus) {
            console.log(batchProcessResult)
            userBatchProcessStatus.data = batchProcessResult;
            userBatchProcessStatus.status = false;
            userBatchProcessStatus.save(function (err, result) {
                child.send({message: 'close'})
            });
        })
    });
    child.on('close', function () {
        console.log('closing code: ');
    });
    child.send({station: station, filter: filter, userName: userName});
}
module.exports = {
    getUserStationId: getUserStationId,
    updateStaId: updateStaId,
    getStationStatus: getStationStatus,
    getStations: getStations,
    createStation: createStation,
    getUserStaThreshold: getUserStaThreshold,
    deleteStation: deleteStation,
    addStation: addStation,
    setStaThreshold: setStaThreshold,
    setUserFindTime: setUserFindTime,
    getUserFindStaData: getUserFindStaData,
    killChild: killChild,
    downloadStaData: downloadStaData
};

