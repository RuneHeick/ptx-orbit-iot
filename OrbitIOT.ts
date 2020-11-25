namespace Orbit_IoT {

    const wifi_ssid :string  = "OrbitWifi"
    const wifi_pw :string  = "Orbit1234"

    const endpoint :string = "34.66.72.29"
    const port :string = "5000"

    let cloud_connected: boolean = false
    let wifi_connected: boolean = false

    const bus_holdback_time : number = 500
    let last_cmd : number = input.runningTime()


    enum Commands {
        //% block="Name"
        Name = 1,
        //% block="Number"
        Number = 2,
        //% block="Text"
        Text = 3
    }      

    function waitForFreeBus()
    {
        let now = input.runningTime()
        if( (now-last_cmd) < bus_holdback_time)
            basic.pause(bus_holdback_time - (now-last_cmd))
        last_cmd = input.runningTime()
    }

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 0) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    function waitForResponse(exspect: string, timeout : number = 10000): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()

        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes(exspect)) {
                result = true
                break
            }
            else if (input.runningTime() - time > timeout) {
                break
            }
        }
        return result
    }

    
    //Initialize ESP8266 module 
    function setupESP8266(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        waitForFreeBus()
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
    }

    function connectWifi(ssid: string, pw: string) : boolean {
        waitForFreeBus()
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitForResponse("WIFI GOT IP")
        return wifi_connected
    }

    function connectOrbitCloud() :boolean
    {
        if(wifi_connected)
        {
            waitForFreeBus()
            let cmd = "AT+CIPSTART=\"TCP\",\"" + endpoint + "\","+ port
            sendAT(cmd)
            cloud_connected = waitForResponse("CONNECT");
        }
        return cloud_connected;
    }

    //% block="Setup OrbitLab Cloud"
    export function setupForCloud()
    {
        if(cloud_connected == false)
        {
            setupESP8266(SerialPin.P8, SerialPin.P12, BaudRate.BaudRate115200)
            if(connectWifi(wifi_ssid, wifi_pw))
            {
                connectOrbitCloud()
            }
        }
    }

    //% block="Cloud Connected %state" weight=70
    export function CloudState(state: boolean) : boolean {
        if (cloud_connected == state) {
            return true
        }
        else {
            return false
        }
    }

    //% block="Wifi Connected %state" weight=70
    export function wifiState(state: boolean) : boolean {
        if (wifi_connected == state) {
            return true
        }
        else {
            return false
        }
    }

    function sendToCloud(cmd: string, value: string)
    {
        if(cloud_connected)
        {
            waitForFreeBus()

            let serial = control.deviceSerialNumber();
            let toSendStr = "{"
            toSendStr += "\"uid\":" + serial + ","
            toSendStr += "\"cmd\":\""+cmd+"\","
            toSendStr += "\"payload\":" + value
            toSendStr += "}"

            sendAT("AT+CIPSEND=" + (toSendStr.length + 2), 100)
            sendAT(toSendStr, 100) // upload data
            waitForResponse("SEND OK");
        }
    }

    //% block="Send group name %name" weight=5
    export function SendNameCmd(name: string)
    {
        sendToCloud("name", "\""+name+"\"")
    }

    //% block="Send a number %value" weight=4
    export function SendNumberCmd(value: number)
    {
        sendToCloud("number", value.toString())
    }

    //% block="Send text %text" weight=4
    export function SendTextCmd(text: string)
    {
        sendToCloud("text", text)
    }

}
