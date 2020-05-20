/*
* Copyright (c) 2015 Samsung Electronics Co., Ltd.
* All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are
* met:
*
* * Redistributions of source code must retain the above copyright
* notice, this list of conditions and the following disclaimer.
* * Redistributions in binary form must reproduce the above
* copyright notice, this list of conditions and the following disclaimer
* in the documentation and/or other materials provided with the
* distribution.
* * Neither the name of Samsung Electronics Co., Ltd. nor the names of its
* contributors may be used to endorse or promote products derived from
* this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
* "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
* LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
* A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
* OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
* SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
* LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
* DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
* THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
* OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var SAAgent,
    SASocket,
    connectionListener,
    responseTxt = document.getElementById("responseTxt"),
    HRMrawsensor = tizen.sensorservice.getDefaultSensor("HRM_RAW");

/* Make Provider application running in background */
tizen.application.getCurrentApplication().hide();

function createHTML(log_string)
{
    var content = document.getElementById("toast-content");
    content.innerHTML = log_string;
    tau.openPopup("#toast");
}


connectionListener = {
    /* Remote peer agent (Consumer) requests a service (Provider) connection */
    onrequest: function (peerAgent) {

        createHTML("peerAgent: peerAgent.appName<br />" +
                    "is requesting Service conncetion...");
        
        console.log('peerAgent.appName: ' + peerAgent.appName);

        /* Check connecting peer by appName*/
        if (peerAgent.appName === "BPEst") {
            SAAgent.acceptServiceConnectionRequest(peerAgent);
            createHTML("Service connection request accepted.");

        } else {
            SAAgent.rejectServiceConnectionRequest(peerAgent);
            createHTML("Service connection request rejected.");
        }
    },

    /* Connection between Provider and Consumer is established */
    onconnect: function (socket) {
        var onConnectionLost,
            dataOnReceive;

        createHTML("Service connection established");

        /* Obtaining socket */
        SASocket = socket;

        onConnectionLost = function onConnectionLost (reason) {
            createHTML("Service Connection disconnected due to following reason:<br />" + reason);
            HRMrawsensor.stop();
        };

        /* Inform when connection would get lost */
        SASocket.setSocketStatusListener(onConnectionLost);

        dataOnReceive =  function dataOnReceive (channelId, data) {
        	
        	  if (!SAAgent.channelIds[0]) {
                  createHTML("Something goes wrong...NO CHANNEL ID!");
                  return;
              }
          	  
        	  /* Send socket to costumer */
              function sendSensorData(hrmRaw, time){
                   // return Data to Android
                   SASocket.sendData(SAAgent.channelIds[0], 'PPG: '+hrmRaw + ' Timestamp: ' + time);
                   //createHTML("Send message:<br />" + hrmRaw);
              }

              function onsuccessCB(hrmInfo) {
            	  var date = new Date(Date.now());
              	  var hours = date.getHours();
              	  var minutes = "0" + date.getMinutes();
              	  var seconds = "0" + date.getSeconds();
              	  var ms = "0" +date.getMilliseconds();
              	  var time = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2) + ':' + ms.substr(-3);

                  console.log('PPG: ' + hrmInfo.lightIntensity + ' Timestamp: ' + time);
                  //holding 15 seconds as HRM sensor needs some time
                  setTimeout(function(){
                      sendSensorData(hrmInfo.lightIntensity, time);
                  },1500);
              }

              function onerrorCB(error) {
                  HRMrawsensor.stop();
                  console.log('Error occurred: ' + error.message);
              }

              function onchangedCB() {
            	  console.log("Start HRMRaw sensor");
                  // onsuccessCB function called at 50 ms Interval
                  setInterval(function(){
                      HRMrawsensor.getHRMRawSensorData(onsuccessCB, onerrorCB);
                      }, 50);
              }
              
              function onsuccessCBInfo(hardwareInfo)
              {
                 console.log("name: " + hardwareInfo.name);
                 console.log("type: " + hardwareInfo.type);
                 console.log("vendor: " + hardwareInfo.vendor);
                 console.log("minValue: " + hardwareInfo.minValue);
                 console.log("maxValue: " + hardwareInfo.maxValue);
                 console.log("resolution: " + hardwareInfo.resolution);
                 console.log("minInterval: " + hardwareInfo.minInterval);
              }
              

        	  if (data === "Retrieving..."){
                  console.log(data);
                  HRMrawsensor.getSensorHardwareInfo(onsuccessCBInfo);
                  HRMrawsensor.start(onchangedCB);    // start HRM raw sensor
        	  }

              // show Data to screen
              var x = document.getElementById("val");
              x.innerHTML = data;
        };

        /* Set listener for incoming data from Consumer */
        SASocket.setDataReceiveListener(dataOnReceive);
    },
    onerror: function (errorCode) {
        createHTML("Service connection error<br />errorCode: " + errorCode);
        HRMrawsensor.stop();
    }
};


function requestOnSuccess (agents) {
    var i = 0;

    for (i; i < agents.length; i += 1) {
        if (agents[i].role === "PROVIDER") {
            createHTML("Service Provider found!<br />" +
                        "Name: " +  agents[i].name);
            SAAgent = agents[i];
            break;
        }
    }

    /* Set listener for upcoming connection from Consumer */
    SAAgent.setServiceConnectionListener(connectionListener);
}

function requestOnError (e) {
    createHTML("requestSAAgent Error" +
                "Error name : " + e.name + "<br />" +
                "Error message : " + e.message);
}

/* Requests the SAAgent specified in the Accessory Service Profile */
webapis.sa.requestSAAgent(requestOnSuccess, requestOnError);


(function () {
    /* Basic Gear gesture & buttons handler */
    window.addEventListener('tizenhwkey', function(ev) {
        var page,
            pageid;

        if (ev.keyName === "back") {
            page = document.getElementsByClassName('ui-page-active')[0];
            pageid = page ? page.id : "";
            if (pageid === "main") {
                try {
                    tizen.application.getCurrentApplication().exit();
                } catch (ignore) {
                }
            } else {
                window.history.back();
            }
        }
    });
}());

(function(tau) {
    var toastPopup = document.getElementById('toast');

    toastPopup.addEventListener('popupshow', function(ev){
        setTimeout(function () {
            tau.closePopup();
        }, 3000);
    }, false);
})(window.tau);