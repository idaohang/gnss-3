MetronicApp.factory('Mongodb', function ($http, $location, settingInfo, Prompt, Passport, httpRequest) {
    var url = "http://" + settingInfo.server + ":" + settingInfo.port;
    var setUserStaId = function (staId, userName, staName, signalType,signalTypeId,startBaseStation,startStaId) {
        var data = {
            staId: staId,
            userName: userName,
            staName: staName,
            signalType: signalType,
            signalTypeId:signalTypeId,
            startBaseStation:startBaseStation,
            startStaId:startStaId
        };
        var setUserStaIdUrl = url + "/userStaId";
        httpRequest.post(setUserStaIdUrl, data, function(data) {
            if(data.status == false){
                return Prompt.promptBox("warning", data.message)
            } else {
                $location.path('/dashboard.html/' + staId)
            }
        })

    }

    var setUserStartStaId = function (staId, userName, staName, signalType,signalTypeId,startBaseStation,startStaId) {
        var data = {
            staId: staId,
            userName: userName,
            staName: staName,
            signalType: signalType,
            signalTypeId:signalTypeId,
            startBaseStation:startBaseStation,
            startStaId:startStaId
        }
        var setUserStartStaIdUrl = url + "/userStartStaId"
        httpRequest.post(setUserStartStaIdUrl, data, function(data) {
            if(data.status == false){
                return Prompt.promptBox("warning", data.message)
            }
        })
    }
    var getUserStaId = function (cb) {
        cb = cb || function () {}
        var getUserStaIdUrl = url + "/userStaId"
        httpRequest.httpGet(getUserStaIdUrl, function(req) {
            if(req.status == false){
                return Prompt.promptBox("warning", req.message)
            }else {
                cb(req)
            }
        })
    }

    var findAllUsers = function (callback) {
        var findAllUsersUrl = url + "/findAllUsers"
        httpRequest.httpGet(findAllUsersUrl, function(data) {
            if(data.status == 400){
                Prompt.promptBox("warning", data.message)
            }else{
                getUserStaId(function(result) {
                    var test = []
                    test.push(data);
                    test.push(result)
                    callback(test)
                })
            }
        })
    }
    var changePassword = function () {
        $("#navbar_edit").on("show.bs.modal", function() {
            //$("#navbar_edit #navbar_pwd_reset").formClear();

        });
        $("#navbar_edit").on("hidden.bs.modal", function() {
            $(this).removeData("bs.modal");

        });
        $(document).on("click", "#navbar_save_btn", function(e) {
            var old_psd = $("#navbar_pwd_reset #old_password").val();
            var new_psd = $("#navbar_pwd_reset #new_password").val();
            var con_psd = $("#navbar_pwd_reset #confirm_password").val();
            //alert(old_psd);
            //alert(new_psd);
            //alert(con_psd);
            if (old_psd == "" || new_psd == "" || con_psd == "") {
                alert("相关字段不为空,请输入!");
                return false;
            };
            if (old_psd == new_psd) {
                alert("旧密码和新密码相同,请重新输入!")
                return false;
            };
            if (new_psd != con_psd) {
                alert("两次输入新密码不相同,请重新输入!");
                return false;
            };
            var params = $("#navbar_pwd_reset").serialize();
            //alert(params);
            //var changePasswordUrl = url + "/changePassword"
            $.ajax({
                cache : true,
                type : "POST",
                url : "changePassword",
                data : params,
                async : false,
                error : function(request) {
                    alert("服务器连接错误,请稍后再试");
                },
                success : function(data) {

                },
            });
        });
    }
    var addAdmin = function (username, password, admin, callback) {
        var data = {
            username: username,
            password: password,
            type: JSON.stringify(admin[0].checked)
        }
        var addAdminUrl = url + "/addAdmin"
        httpRequest.post(addAdminUrl, data, function(data) {
            if(data.status == false){
                Prompt.promptBox("warning", data.message)
            }else{
                callback(data)
            }
        })
    }
    var addUsers = function (username, password,station, admin, callback) {
        var data = {
            username: username,
            password: password,
            station: station,
            type: JSON.stringify(admin[0].checked)
        }
        var addUsersUrl = url + "/addUser"
        httpRequest.post(addUsersUrl, data, function(data) {
            if(data.status == false){
                Prompt.promptBox("warning", data.message)
            }else{
                callback(data)
            }
        })
    }
    var deleteUser = function (username) {
        var data = {
            username: username
        }
        var deleteUserUrl = url + "/deleteUser"
        httpRequest.post(deleteUserUrl, data, function(data) {
            if(data.status == false){
                return Prompt.promptBox("warning", data.message)
            } else {
                Prompt.promptBox("success", data)
            }
        })
    }
    var addStation = function(name,staId, cb) {
        cb = cb || function () {}
        var data = {
            name: name,
            staId: staId,
            //stationName: stationName
        }
        //console.log(data)
        var addStationUrl = url + "/addStation"
        httpRequest.post(addStationUrl, data, function(data) {
            if(data.status == 400){
                Prompt.promptBox("warning", data.message)
            }else{
                cb(data);
            }
        })
    }
    var getConfig = function(name,staId, cb) {
        cb = cb || function () {}
        var data = {
            name: name,
            staId: staId
            //stationName: stationName
        }
        var getAllConfigUrl = url + "/StationConfig"
        httpRequest.post(getAllConfigUrl, data, function(data) {
            cb(data)
        })
    }
    var deleteStation = function(name, staId,cb) {
        var data = {
            name: name,
            staId: staId
            //stationName:stationName
        }
        var deleteStationUrl = url + "/deleteStation"
        httpRequest.post(deleteStationUrl, data, function(data) {
            if (data.status == 400) {
               return Prompt.promptBox("warning", data.message)
            } else if (data.status == true) {
                var remind = '删除基站成功！'
                Prompt.promptBox("success", remind)
                cb()
            }
        })

    }
    var findSatData = function (testData, cb) {
        cb = cb || function () {}
        var findSatDataUrl = url + "/findSatData"
       httpRequest.post(findSatDataUrl, testData, function(data) {
           cb(data);
       })
    }

    var downloadSatData = function (cb) {
        cb = cb || function () {}
        var downloadSatDataUrl = url + "/downloadStaData"
        httpRequest.httpGet(downloadSatDataUrl, function(data) {
            cb(data);
        })
    }
    var getUserFindStaData = function (cb) {
        cb = cb || function () {}
        var findSatDataUrl = url + "/getUserFindStaData"
        httpRequest.httpGet(findSatDataUrl,function(data) {
            cb(data);
        })
    };

    var getStation = function (cb) {
        cb = cb || function () {};
        var getStationUrl = url + "/getStation"
        httpRequest.httpGet(getStationUrl, function(data) {
            if(data.status == 400){
              return  Prompt.promptBox("warning", data.message)
            } else {
                cb(data)
            }
        })
    };
    return {
        setUserStaId: setUserStaId,setUserStartStaId:setUserStartStaId,
        getUserStaId: getUserStaId, findAllUsers: findAllUsers, addUsers: addUsers, deleteUser: deleteUser,
        findSatData: findSatData, addStation: addStation, getStation: getStation, deleteStation: deleteStation,
        getUserFindStaData:getUserFindStaData,downloadSatData:downloadSatData,changePassword:changePassword,
        getConfig:getConfig,addAdmin:addAdmin

    };

}).factory("getCommitThreshold", function ($rootScope, $http, $location, settingInfo, httpRequest, Prompt, Mongodb) {
    var url = "http://" + settingInfo.server + ":" + settingInfo.port;
    var threshold = function (staName,cb) {
        cb = cb || function () {}
        var userName = localStorage.getItem('userName')
        var data = {
            userName: userName,
            staName: staName
        }
        var thresholdUrl = url + "/getStaThreshold"
        httpRequest.post(thresholdUrl, data, function(data) {
            if(data.status == 400){
                return Prompt.promptBox("warning", data.message)
            } else {
                cb(data);
            }
        })
    }
    var setStaThreshold = function(staName, username, Threshold) {
        var setThreshold = {
            staName:staName,
            username:username,
            Threshold:Threshold
        }
        var setStaThresholdUrl = url + "/setStaThreshold"
        httpRequest.post(setStaThresholdUrl, setThreshold, function(data) {
            if(data.status == 400||data.status == false){
               return  Prompt.promptBox("warning", data.message)
            } else {
                Prompt.promptBox("success", '修改成功！！')
                $location.path('/threshold')
            }
        })
    }
    var getUserStaId = function (callback) {
        var getUserStaIdUrl = url + "/userStaId"
        httpRequest.httpGet(getUserStaIdUrl, function(req) {
            if(req.status == false){
                return Prompt.promptBox("warning", data.message)
            } else if(req == false) {
                Mongodb.getStation(function (stationInfo) {
                    $location.path('/dashboard.html/' + stationInfo[0].staId)
                })
            }else {
                //console.log(req)
                if(req.allStation[0] != undefined) {
                    $rootScope.station = localStorage.getItem('thresholdBastation') || req.allStation[0].name;
                    var staName = $rootScope.station;
                    localStorage.setItem('thresholdBastation', staName);
                    threshold(staName, function (data) {
                        var arr = [];
                        var Threshold = data.staThreshold;
                        arr.push(req.allStation);
                        arr.push(Threshold)
                        callback(arr);
                    })
                }else if(req.allStation[0] == undefined){
                    var userSta = []
                    userSta.push(req.userStation)
                    $rootScope.station = localStorage.getItem('thresholdBastation') || req.userStation.name;
                    var staName = $rootScope.station;
                    localStorage.setItem('thresholdBastation', staName);
                    threshold(staName, function (data) {
                        var arr = [];
                        var Threshold = data.staThreshold;
                        arr.push(userSta);
                        arr.push(Threshold)
                        callback(arr);
                    })

                }else {
                    $rootScope.station = undefined;
                    callback(false)
                }
            }
        })
    }
    return {threshold: threshold, setStaThreshold: setStaThreshold,getUserStaId: getUserStaId};
}).factory("getStationStatus", function ($http, settingInfo, Passport, httpRequest, Prompt) {
    //对数据分类处理
    //整理数据
    var mapping = function (logJSON, dataId, timestamp) {
        console.log()
        var algoIn = logJSON.satR,//原始数据[28]
            algoOut = logJSON.posR;//


        var webIn = {
            posR: algoOut,
            timestamp: timestamp,//时间戳
            time: logJSON.time,
            dataId: dataId,//id
            obsinfo:[],
            satpos:{gpsatpos:[],glsatpos:[],bdsatpos:[]},
            SNY:{gpsSNY:[[],[]],glsSNY:[[],[]],bdsSNY:[[],[]]}
        }

        //console.log(webIn.satpos)
        //console.log(algoIn)
        //algoIn数组里包含对象
        //原始数据
        for (var i=0;i<algoIn.length;i++) {
            var obs = algoIn[i];
            //console.log(obs)
            //原始数据
            var obsinfo = obs;
            webIn.obsinfo.push(obsinfo);
            if (0 === obs.sys) {
                //gps
                console.log(obs.Ele)
                var gpsatpos = {
                    x: obs.Azi * (180.0 / 3.1415926535897932),//x方位角
                    y: obs.Ele * (180.0 / 3.1415926535897932),//y 仰角

                    id: obs.sat//型号卫星id
                }

                webIn.SNY.gpsSNY[0].push([obs.sat, obs.SNR[0]]);
                webIn.SNY.gpsSNY[1].push([obs.sat, obs.SNR[1]]);
                webIn.satpos.gpsatpos.push(gpsatpos);//push到webin，放到大对象里

            } else if (1 === obs.sys) {
                var glsatpos = {
                    //gls
                    x: obs.Azi * (180.0 / 3.1415926535897932),
                    y: obs.Ele * (180.0 / 3.1415926535897932),
                    SNR:{1:[obs.sat, obs.SNR[0]],2:[obs.sat, obs.SNR[1]]},
                    id: obs.sat
                };
                webIn.SNY.glsSNY[0].push([obs.sat, obs.SNR[0]]);
                webIn.SNY.glsSNY[1].push([obs.sat, obs.SNR[1]]);
                webIn.satpos.glsatpos.push(glsatpos);

            } else if (2 === obs.sys) {
                //北斗
                var bdsatpos = {
                    x: obs.Azi * (180.0 / 3.1415926535897932),
                    y: obs.Ele * (180.0 / 3.1415926535897932),
                    SNR:{1:[obs.sat, obs.SNR[0]],2:[obs.sat, obs.SNR[1]]},
                    id: obs.sat
                }
                webIn.SNY.bdsSNY[0].push([obs.sat, obs.SNR[0]]);
                webIn.SNY.bdsSNY[1].push([obs.sat, obs.SNR[1]]);
                webIn.satpos.bdsatpos.push(bdsatpos);

            }
//星空图里三个的具体数据
        }
        webIn.SNY.gpsSNY[0].sort(sortByindexOne)
        webIn.SNY.gpsSNY[1].sort(sortByindexOne)
        webIn.SNY.glsSNY[0].sort(sortByindexOne)
        webIn.SNY.glsSNY[1].sort(sortByindexOne)
        webIn.SNY.bdsSNY[0].sort(sortByindexOne)
        webIn.SNY.bdsSNY[1].sort(sortByindexOne)

        function sortByindexOne(a,b){
            return a[0]-b[0]
        }

        return webIn;
    }
    function sortNumber(a, b)
    {
        return a - b
    }
    var getStationStatus = function (staId, limit, cb) {
        cb = cb || function () {}
        var getStationStatusUrl = "http://" + settingInfo.server + ":" + settingInfo.port + "/getStationStatus?staId=" + staId + "&limit=" + limit
        httpRequest.httpGet(getStationStatusUrl, function(req) {
            //console.log(req)先十条然后动态１条
            //console.log(req.stationData)
            //console.log(req.stationData)大数组里对象为字符串10条数据
            if(req.status == 400){
               return Prompt.promptBox("warning", data.message)
            } else if(req.stationData) {
                var result = [];
                if(req.stationData.length == 10) {
                    var stationData = [];
                    req.stationData.forEach(function (fileData) {
                        //ajax请求发送回来数据，查找原始数据的话直接打印，打印不出来则是解析错误
                        var data = JSON.parse(fileData);
                        data = mapping(data.data, data._id, data.updated_at)
                        stationData.push(data)
                    })

                    var by = function(name){
                        return function(o, p){
                            var a, b;
                            if (typeof o === "object" && typeof p === "object" && o && p) {
                                a = o[name];
                                b = p[name];
                                if (a === b) {
                                    return 0;
                                }
                                if (typeof a === typeof b) {
                                    return a < b ? 1 : -1;
                                }
                                return typeof a < typeof b ? 1 : -1;
                            }
                            else {
                                throw ("error");
                            }
                        }
                    };
                    req.stationData = stationData.sort(by('timestamp'))//按照时间戳排序
                    cb(req);
                }else {
                    req.stationData.forEach(function (fileData) {
                        var data = JSON.parse(fileData);

                        var newData = mapping(data.data, data._id, data.updated_at)
                        result.push(newData)
                    })
                    req.stationData = result;
                    cb(req);
                }
            }else{
                cb(req);
            }
        })
        var userName = localStorage.getItem('userName')
    };
    return {getStationStatus: getStationStatus};
}).factory("httpRequest",function($http, $rootScope, Show, $location, settingInfo){
    var post = function(url, data, cb) {
        var req = {
            url: url,
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            withCredentials: true,
            data: data
        }
        $http(req).success(function (result) {
            if(result.bool == false) return logout();
            cb(result)
        }).error(function () {
            cb(false)
            return logout();
        })
    }
    var httpGet = function(url, cb) {
        $http.get(url, {withCredentials: true}).success(function(result){
            if(result.bool == false) return logout();
            cb(result)
        }).error(function (req) {
            cb(false)
            return logout();
        })
    }

    function logout (){
        localStorage.clear();
        var sideBarArr = ['dashboard', 'blank', 'threshold', 'stardata', 'administrator'];
        for (var i = 0; i < sideBarArr.length; i++) {
            var sideBarClass = $('#' + sideBarArr[i]).attr('class');
            if (sideBarClass == 'nav-item active') {
                $('#' + sideBarArr[i]).attr('class', 'nav-item');
            }
        }
        $location.path('/login');
    }

    return {post: post, httpGet: httpGet}
})

