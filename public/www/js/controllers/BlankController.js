angular.module('MetronicApp').controller('BlankController', function ($http, $rootScope, $scope, Mongodb, $location, Prompt, getStationStatus,
                                                                      DateTable, DataAnalyseChart, EventData, $timeout, $interval, BatchProcess, Threshold) {
    //var getBatchDataPolling;
    //var timeDelay;
    var currentStation;
    var isAdmin;
    var currentProcess;
    //getStation($rootScope.rootIsAdmin);
    init();
    initThreshold()

    function getSingal() {
        var indexs = [];
        $('#sys').find('input').each(function () {
            if (this.checked) {
                indexs.push(Number(this.value))
            }
        });
        return indexs
    }

    function setOptions() {
        Threshold.getThreshold(function (allThreshold) {
            if (allThreshold.status) {
                var threshold = allThreshold.allThreshold[$scope.station];
                var indexs = getSingal();
                var hpl_num_is_able = false;
                var vpl_num_is_able = false;
                for (var i = 0; i < indexs.length; i++) {
                        if( threshold == undefined) return
                    if (!threshold[indexs[i]] || !threshold[indexs[i]].handleData || threshold[indexs[i]].handleData.HPL === undefined||threshold[indexs[i]].handleData.HPL === null) {
                        hpl_num_is_able = true;
                        $('input[name=hpl_num]')[0].checked = false;
                    }
                    if (!threshold[indexs[i]] || !threshold[indexs[i]].handleData || threshold[indexs[i]].handleData.VPL === undefined||threshold[indexs[i]].handleData.VPL === null) {
                        vpl_num_is_able = true;
                        $('input[name=vpl_num]')[0].checked = false;
                    }
                }

            } else {

            }


            $scope.optionsAble = {
                vpl_num_is_able: vpl_num_is_able,
                hpl_num_is_able: hpl_num_is_able
            }


        });

    }

    function init() {
        var isAdmin = $rootScope.rootIsAdmin;
        $(".loading").animate({"width": "0%"}, 0);
        DateTable.dateTable();
        $scope.sysNav = ['GPS', 'GLS', 'BDS', '组合'];
        $scope.sys = {
            'GPS': getOptionLocal('GPS'),
            'GLS': getOptionLocal('GLS'),
            'BDS': getOptionLocal('BDS'),
            'GROUP': getOptionLocal('GROUP')
        }
        $scope.option = {
            sat_hist: getOptionLocal('sat_hist'),
            err_hist: getOptionLocal('err_hist'),
            dop_hist: getOptionLocal('dop_hist'),
            PL_hist: getOptionLocal('PL_hist'),
            hpl_num: getOptionLocal('hpl_num'),
            vpl_num: getOptionLocal('vpl_num'),
            coordinate: getOptionLocal('coordinate')
        };
        $scope.setOptions = setOptions;
        $scope.optionsAble = {};


        initStation();
        initOption()
    }

    recordOption()

    function getOptionLocal(key) {
        return localStorage.getItem($rootScope.rootUserInfo.username + "_" + key) || false
    }

    function setOptionLocal(key, value) {
        return localStorage.setItem($rootScope.rootUserInfo.username + "_" + key, value)
    }

    function recordOption() {
        $('#options').find('input').change(function () {
            setOptionLocal($(this).attr('name'), this.checked)
        })
        $('#sys').find('input').change(function () {
            setOptionLocal($(this).attr('name'), this.checked)
        })
    }


    function initStation() {
        $rootScope.$watch('rootIsAdmin', function (rootIsAdmin) {
            if (isAdmin == rootIsAdmin || rootIsAdmin == undefined) return
            isAdmin = rootIsAdmin;
            $scope.isAdmin = rootIsAdmin;
            getStation($scope.isAdmin)
        });
        $scope.$watch('sys', function (filter) {
            getStation($scope.isAdmin)
        });
        getStation($rootScope.rootIsAdmin);
    }

    function initOption() {
        setOptions();
        $scope.$watch('station', function (station) {
            if (station == undefined || currentStation == station) return;
            currentStation = station;
            setOptions()
        })

    }

        $scope.$watch('station', function (station) {
        if(station == undefined) return;
        setOptionLocal('showStation',station)
        // localStorage.setItem($rootScope.rootUserInfo.username + "_"+'showStation', station)
        Threshold.getHandleData(function (allThreshold) {
            if (station == undefined) return
            $scope.stationInfo = allThreshold.allThreshold[station]
            if ($scope.signal == undefined) return
            if($scope.stationInfo == undefined)return
            $scope.rbUpDate = $scope.stationInfo[$scope.signal].rbUpDate
            var stationName = '';
            if ($scope.isAdmin) {
                $scope.allStations.forEach(function (oneStation) {
                    if (oneStation.staId == station) {
                        stationName = oneStation.name
                    }
                })
            } else {
                stationName = $scope.stationInfoName
            }

            if (JSON.stringify($scope.rbUpDate) == '{}') {
                Prompt.promptBox('warning', stationName + '未设置基准坐标')
            } else {
                Prompt.promptBox('success', stationName + '基准坐标更新时间为：' + $scope.rbUpDate)
            }
        })

        if (!station || !$scope.allThreshold) return;
        showThreshold()
    });


    function getFilter() {
        var sys = [];
        var options = {};
        $('#sys').find('input').each(function () {
            if (this.checked) {
                sys.push(Number(this.value))
            }
        });
        $('#options input').each(function () {
            if (this.checked) {
                options[this.name] = 1;
            }
        });
        $('input[name=coordinate]').each(function () {
            if (this.checked) {
                options.coordinate = 1;
            }
        })
        return {
            sys: sys,
            options: options
        }

    }

    $scope.findData = function () {
        var startDate = $('#searchDateRange').html();
        var stationId = $('#station').val();
        if (stationId) {
            $("#dataStatisticsChart").css("opacity", 0);
            $('#dataStatisticsChartLoding').show();
            var str = startDate.replace(new RegExp('-', 'gm'), ',')
                .replace(new RegExp(' ', 'gm'), ',');
            var allDateArray = DateTable.allDate(startDate);

            var findData = {};
            findData.allDate = allDateArray;
            findData.sta_id = stationId;
            findData.bt = str.substring(0, 10);
            findData.et = str.substring(13, 23);
            var filer = getFilter();
            findData.sys = filer.sys;
            findData.options = filer.options
            beStartBatchProcess(findData)

        } else {
            Prompt.promptBox('warning', '请选择要查询的基站！！')
        }
        $scope.showCoordinate = $scope.option.coordinate


    };

    function beStartBatchProcess(findData) {
        BatchProcess.startBatchProcess(findData, function (data) {
            if (data.status == 'unFind') {
                $('#dataStatisticsChartLoding').hide();
                Prompt.promptBox("warning", "查询基站被删除,请刷新页面")
            }
            else {
                startBatchProcess(data)
            }

        })
    }

    $scope.stopData = stopBatchProcess;

    function startBatchProcess(data) {
        //if (data.status == 201) {
        //    waiting(data);
        //    return Prompt.promptBox("warning", "有一个数据正在处理！将为你返回正在执行中的时间段分析结果")
        //}
        if (data.status == 202) {
            $('#dataStatisticsChartLoding').hide();
            return Prompt.promptBox("warning", "选择的日期间隔中数据为空！")
        }


        waiting(data)
    }

//进度条

    function waiting(data) {
        var waitTime = parseInt(data.effectiveTime)
        currentProcess = data.processId
        if (!show_wait(waitTime)) return;
        $scope.mySwitch = true;
        getResult(data.processId);

    }


    function show_wait(waitTime) {
        var $loading = $('.loading');
        if (!$loading.is(":hidden")) return false;
        $('#dataStatisticsChart .col-xs-12').hide();
        $loading.stop();
        $loading.animate({"width": "0%"}, 0);
        $loading.show();
        $loading.animate({"width": "100%"}, 1000 * waitTime);
        return true;
    }

    function getResult(processId) {
        if(!processId) return
        if ($location.path() != '/blank') return;

        BatchProcess.getBatchProcessResult(processId,function (data) {
            if (data.status == 400) {
                return batchProcessErr()
            }
            if (data.result.isRunning === 1) {
                return setTimeout(function () {
                    getResult(processId)
                }, 5000)
            }
            if (data.result.isRunning === -1) {
                return batchProcessErr();
            }
            if (data.result.isRunning === -2) {
                return batchProcessErr();
                // return batchProcessErr('正在预处理，请稍后重试');
            }
            var username = data.result.userName
            $scope.mySwitch = false;
            localStorage.setItem($rootScope.rootUserInfo.username + '_current_result_processId', processId)
            $http.get('/batchHandleResult/' + $rootScope.rootUserInfo.username + '/' + processId + '/' + $rootScope.rootUserInfo.username + '.json').success(function (data) {
                showProcessResult(data, username)

            })

        })
    }

    function stopBatchProcess() {
        BatchProcess.stopBatchProcess(currentProcess, function (result) {

            if (result.message == 'success') {
                Prompt.promptBox("success", "进程已结束")
            } else {
                Prompt.promptBox("warning", "进程处理完毕")
            }
            $scope.mySwitch = false;
            $('.loading').hide();
        })
    }


    function batchProcessErr(messsage) {
        $(".loading").hide();
        Prompt.promptBox("warning", messsage || "处理异常请再次请求")
        $('#dataStatisticsChartLoding').hide();
    }

    function showProcessResult(data, username) {
        $('.loading').hide();
        Prompt.promptBox("success", "数据处理完毕");
        showResult(data, username)

    }

    //开始配置阈值参数
    function initThreshold() {
        $scope.allSingal = {
            2: 'BDS',
            0: 'GPS',
            1: 'GLS',
            3: '组合'
        };
        $scope.signal = '0';
        getThreshold();
        $scope.isAdmin = $rootScope.rootIsAdmin;
        $rootScope.$watch('rootIsAdmin', function (rootIsAdmin) {
            $scope.isAdmin = rootIsAdmin;
            getStation($scope.isAdmin)
        });
        getStation($scope.isAdmin);
        $scope.isReadonly = false

    }

    function getStation(isAdmin) {
        if (isAdmin) {
            $scope.allStations = $rootScope.allStations;

            $rootScope.$watch('allStations', function (allStations) {
                if (allStations == undefined) return;
                $scope.allStations = allStations;
                if(checkStation()){
                    $scope.station = getOptionLocal('showStation')
                    initResult($scope.station );

                }else{
                    $scope.station = ($scope.allStations[0] ? $scope.allStations[0].staId : '')
                }

                // console.log('--------------------')
                // console.log(localStorage.getItem('showStation'))
                // $scope.station = localStorage.getItem('showStation') ||($scope.allStations[0] ? $scope.allStations[0].staId : '')

            });

        } else {
            $scope.station = $rootScope.stationId;
            $scope.stationInfoId = $rootScope.stationId;
            $scope.stationInfoName = $rootScope.stationName;

        }
    }

    function checkStation(){
        var status = false;
        for (var i in $scope.allStations){

            if($scope.allStations[i].staId == getOptionLocal('showStation')){
                status = true;
                break;
            }
        }
        return status
    }

    function getThreshold() {
        Threshold.getHandleData(function (allThreshold) {
            $scope.allThreshold = allThreshold.allThreshold;
            showThreshold()
        })
    }

    $scope.$watch('signal', function (signal) {
        if (!signal || !$scope.allThreshold) return;
        showThreshold()
    });


    function showThreshold() {
        if (!$scope.isAdmin) {
            $scope.isReadonly = false;
        }

        $scope.threshold = $scope.allThreshold[$scope.station] ? $scope.allThreshold[$scope.station][$scope.signal].handleData : {}
        if (!$scope.isAdmin) {
            $scope.isReadonly = true;
        }

    }

    $scope.commitThreshold = function () {
        if (!$scope.station||!$scope.signal||!$scope.threshold) return
        var data = {
            staId: $scope.station,
            signal: $scope.signal,
            handleData: $scope.threshold,
            // config:$scope.config,
        };
        Threshold.setHandleData(data, function (allHandleData) {

            if (allHandleData.status) {
                $scope.allThreshold = allHandleData.allThreshold;

                showThreshold()
                Prompt.promptBox('success', '保存成功')
                setOptions()
            } else {

                Prompt.promptBox('warning', '请刷新')
            }

        })
    };

    //结束配置阈值参数

    function showResult(data, username) {
        $('#dataStatisticsChartLoding').hide();
        $("#dataStatisticsChart").css("opacity", 1);
        showTime(data, username);
        showErrHist('HErrHist', data, 'herr_hist');
        showErrHist('VErrHist', data, 'verr_hist');
        showDop('Hdop', data, 'vdop_hist');
        showDop('Vdop', data, 'hdop_hist');
        showPL('VPL', data, 'vpl_hist');
        showPL('HPL', data, 'hpl_hist');

        showAvailability('content', data);
        showCoordinate('container', data)
        showStaNum('StaNum', data);

    }

    function showErrHist(type, data, showType) {

        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        var names = ['GPSERRHIST', 'GLOERRHIST', 'BDSERRHIST', 'MULTIERRHIST'];

        var series = [];
        Object.keys(data).forEach(function (key) {
            var info = {name: names[Number(key)], data: []};
            if (!data[key][showType]) return;
            var currentRate = 0
            data[key][showType].Y.forEach(function (y, index) {
                if (!y) return;
                currentRate += y;
                info.data.push([data[key][showType].X[index], currentRate])
            });
            if (info.data.length > 0) {
                series.push(info)
            }
        });
        var filer = getFilter();
        if (filer.options.err_hist === undefined)  return;
        // if (series.length == 0) return;
        if (series.length != 0) {
            if (type == 'HErrHist'&& $scope.threshold != undefined && !isNaN($scope.threshold.dH)) {
                series.push({name: "WARNINGDH", data: [[$scope.threshold.dH, 0], [$scope.threshold.dH, 1]]});
            }
            if (type == 'VErrHist'&& $scope.threshold != undefined && !isNaN($scope.threshold.dV)) {
                series.push({name: "WARNINGDV", data: [[$scope.threshold.dV, 0], [$scope.threshold.dV, 1]]})
            }


        }
        $('#' + type + '_container').show();

        Highcharts.setOptions({
            lang: {
                resetZoom: '重置',
                resetZoomTitle: '重置缩放比例'
            },
            global: {
                useUTC: false
            }
        });

        $('#' + type).highcharts({

            exporting: {
                enabled: false
            },
            chart: {
                type: 'line',
                zoomType: 'x',
                panning: true,
                panKey: 'shift',
                selectionMarkerFill: 'rgba(0,0,0, 0.2)',
                resetZoomButton: {
                    position: {
                        align: 'right',
                        verticalAlign: 'top',
                        x: 0,
                        y: -30
                    },
                    theme: {
                        fill: 'white',
                        stroke: 'silver',
                        r: 0,
                        states: {
                            hover: {
                                fill: '#41739D',
                                style: {
                                    color: 'white'
                                }
                            }
                        }
                    }
                }
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            subtitle: {
                text: '双击选中区域放大图标，按住shift点击拖动'
            },
            xAxis: {
                labels: {
                    formatter: function () {
                        return this.value;
                    }
                }
            },
            series: series,
            yAxis: {
                min: 0,
                max: 1,
                title: {
                    text: ''
                }
            },
        })
    }

    function showDop(type, data, showType) {
        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        var names = ['GPSDOP', 'GLODOP', 'BDSDOP', 'MULTIDOP'];
        var series = [];
        Object.keys(data).forEach(function (key) {
            var info = {name: names[Number(key)], data: []};
            if (!data[key][showType]) return;
            var currentRate = 0;
            data[key][showType].X.forEach(function (x, index) {
                if (!x) return;
                currentRate += data[key][showType].Y[index];
                info.data.push([x, currentRate])
            });
            if (info.data.length > 0) {
                series.push(info)
            }

        });
        if (series.length == 0) return;
        if (type == 'Hdop'&& $scope.threshold != undefined && !isNaN($scope.threshold.HDOP)) {
            series.push({name: "WARNINGHDOP", data: [[$scope.threshold.HDOP, 0], [$scope.threshold.HDOP, 1]]})
        }
        if (type == 'Vdop'&& $scope.threshold != undefined && !isNaN($scope.threshold.VDOP)) {
            series.push({name: "WARNINGVDOP", data: [[$scope.threshold.VDOP, 0], [$scope.threshold.VDOP, 1]]});
        }


        $('#' + type + '_container').show();
        Highcharts.setOptions({
            lang: {
                resetZoom: '重置',
                resetZoomTitle: '重置缩放比例'
            },
            global: {
                useUTC: false
            }
        });

        $('#' + type).highcharts({

            exporting: {
                enabled: false
            },
            chart: {
                type: 'line',
                zoomType: 'x',
                panning: true,
                panKey: 'shift',
                selectionMarkerFill: 'rgba(0,0,0, 0.2)',
                resetZoomButton: {
                    position: {
                        align: 'right',
                        verticalAlign: 'top',
                        x: 0,
                        y: -30
                    },
                    theme: {
                        fill: 'white',
                        stroke: 'silver',
                        r: 0,
                        states: {
                            hover: {
                                fill: '#41739D',
                                style: {
                                    color: 'white'
                                }
                            }
                        }
                    }
                }
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            subtitle: {
                text: '双击选中区域放大图标，按住shift点击拖动'
            },
            xAxis: {
                labels: {
                    formatter: function () {
                        return this.value;
                    }
                }
            },
            series: series,
            yAxis: {
                min: 0,
                max: 1,
                title: {
                    text: ''
                }
            },
        })
    }


    function showPL(type, data, showType) {

        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        var names = ['GPSPL', 'GLOPL', 'BDSPL', 'MULTIPL'];

        var series = [];
        Object.keys(data).forEach(function (key) {
            var currentRate = 0
            var info = {name: names[Number(key)], data: []};
            if (!data[key][showType]) return;
            data[key][showType].X.forEach(function (x, index) {
                if (!x) return;
                currentRate += data[key][showType].Y[index];
                info.data.push([x, currentRate])
            });
            if (info.data.length > 0) {
                series.push(info)
            }
        });
        if (series.length == 0) return;
        if (type == 'VPL'&& $scope.threshold != undefined && !isNaN($scope.threshold.VPL)) {

            series.push({name: "WARNINGVPL", data: [[$scope.threshold.VPL, 0], [$scope.threshold.VPL, 1]]});
        }
        if (type == 'HPL' && $scope.threshold != undefined && !isNaN($scope.threshold.HPL)) {
            if ($scope.threshold == undefined) return
            series.push({name: "WARNINGHPL", data: [[$scope.threshold.HPL, 0], [$scope.threshold.HPL, 1]]})
        }

        $('#' + type + '_container').show();

        Highcharts.setOptions({
            lang: {
                resetZoom: '重置',
                resetZoomTitle: '重置缩放比例'
            },
            global: {
                useUTC: false
            }
        });

        $('#' + type).highcharts({

            exporting: {
                enabled: false
            },
            chart: {
                type: 'line',
                zoomType: 'x',
                panning: true,
                panKey: 'shift',
                selectionMarkerFill: 'rgba(0,0,0, 0.2)',
                resetZoomButton: {
                    position: {
                        align: 'right',
                        verticalAlign: 'top',
                        x: 0,
                        y: -30
                    },
                    theme: {
                        fill: 'white',
                        stroke: 'silver',
                        r: 0,
                        states: {
                            hover: {
                                fill: '#41739D',
                                style: {
                                    color: 'white'
                                }
                            }
                        }
                    }
                }
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            subtitle: {
                text: '双击选中区域放大图标，按住shift点击拖动'
            },
            xAxis: {
                labels: {
                    formatter: function () {
                        return this.value;
                    }
                }
            },
            yAxis: {
                min: 0,
                max: 1,
                title: {
                    text: ''
                }
            },
            series: series
        })
    }

    function showTime(data, username) {
        var signals = ['GPS', 'GLO', 'BDS', 'MULTI'];
        for (var sys in data) {
            var sysIndex = parseInt(sys);
            if (data[sys].up_slice.vpl_num == 1) {

                chartTimeLine(signals[sysIndex] + 'VPLTime', signals[sysIndex] + 'vpl_num.png', username)
            }
            if (data[sys].up_slice.hpl_num == 1) {
                chartTimeLine(signals[sysIndex] + 'HPLTime', signals[sysIndex] + 'hpl_num.png', username)
            }

        }
    }

    function chartTimeLine(id, imageName, username) {


        var processId = localStorage.getItem($rootScope.rootUserInfo.username + '_current_result_processId');
        $("#" + id + ' img').attr('src', '/batchHandleResult/' + username + '/' + processId + '/' + imageName)
        $('#' + id + '_loading').hide();
        $('#' + id + '_content').show();
        $('#' + id + '_container').show();


    }

    function showStaNum(type, data) {
        //var showData = data[type];
        var names = ['GPSSTANUM', 'GLOSTANUM', 'BDSSTANUM', 'MULTISTANUM'];

        var series = [];
        Object.keys(data).forEach(function (key) {
            var info = {name: names[Number(key)], data: []};
            if (!data[key].sat_hist) return;
            data[key].sat_hist.X.forEach(function (x, index) {
                info.data.push([x, data[key].sat_hist.Y[index]])
            });
            if (info.data.length > 0) {
                series.push(info)
            }
        });
        if (series.length == 0) return;
        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        $('#' + type + '_container').show();
        $('#' + type).highcharts({
            chart: {
                type: 'column'

            },
            //线类型
            title: {
                text: ''
            },
            //标题
            subtitle: {
                text: ''
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            xAxis: {
                type: 'category',
                tickWidth: 1

            },
            yAxis: {
                min: 0,
                max: 1,
                title: {
                    text: ''
                }
            },
            legend: {
                enabled: true
            },
            //图例开关,默认是：true
            series: series

        });
    }

    function initResult(stationId) {
        var processId = localStorage.getItem($rootScope.rootUserInfo.username + '_current_result_processId');
        if (processId === null) return;
        if(processId.split('_')[0] ===stationId){
            $http.get('/batchHandleResult/' + $rootScope.rootUserInfo.username + '/' + processId + '/' + $rootScope.rootUserInfo.username + '.json').success(function (data) {
            showResult(data, $rootScope.rootUserInfo.username)

        })
        }

    }


    function showAvailability(type, result) {
        $scope.processResult = {};
        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        $('#' + type + '_container').show();
        Object.keys(result).forEach(function (key) {
            var value = result[key];
            $scope.processResult[key] = {};
            $scope.processResult[key].availability = value.availability;
            $scope.processResult[key].continuity = value.continuity;
            if (value.acc95_h == undefined) {
                $scope.processResult[key].acc95_h = 'NA'
            } else {
                $scope.processResult[key].acc95_h = value.acc95_h;
            }
            if (value.acc95_v == undefined) {
                $scope.processResult[key].acc95_v = 'NA'
            } else {
                $scope.processResult[key].acc95_v = value.acc95_v;
            }
            $scope.processResult[key].integrity = value.integrity
        });

    }

    function showCoordinate(type, result) {
         var filer = getFilter();
        if(filer.options.coordinate === undefined||filer.options.coordinate ===0){
           return $scope.show = true
        }
        $scope.coordinateInfo = {};
        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        $('#' + type + '_container').show();
        Object.keys(result).forEach(function (key) {
            var value = result[key];
            $scope.coordinateInfo[key] = {};
            if(value.new_rb_log == null){
                $scope.coordinateInfo[key].longitude = '-'
                $scope.coordinateInfo[key].latitude ='-'
                $scope.coordinateInfo[key].Altitude = '-'
            }else if(value.new_rb_log == undefined){
                $scope.coordinateInfo[key].longitude = 'NA'
                $scope.coordinateInfo[key].latitude ='NA'
                $scope.coordinateInfo[key].Altitude = 'NA'
            }else {
                $scope.coordinateInfo[key].longitude = (value.new_rb_log[1]*180/Math.PI).toFixed(7)+'°'
                $scope.coordinateInfo[key].latitude = (value.new_rb_log[0]*180/Math.PI).toFixed(7)+'°'
                $scope.coordinateInfo[key].Altitude = value.new_rb_log[2].toFixed(2)+'m'
            }


        });
    }


});