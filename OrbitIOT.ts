namespace Orbit_IoT {

    const wifi_ssid :string  = "OrbitWifi"
    const wifi_pw :string  = "Orbit1234"

    const endpoint :string = "34.66.72.29"
    const port :string = "5000"

    let cloud_connected: boolean = false
    let wifi_connected: boolean = false

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
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        basic.pause(1000)
    }

    function connectWifi(ssid: string, pw: string) : boolean {
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        return waitForResponse("WIFI GOT IP")
    }

    function connectOrbitCloud() 
    {
        basic.pause(500)
        let cmd = "AT+CIPSTART=\"TCP\",\"" + endpoint + "\","+ port
        sendAT(cmd)
        return waitForResponse("CONNECT")
    }

    //% block="Setup OrbitLab Cloud"
    export function setupForCloud()
    {
        if(cloud_connected == false)
        {
            setupESP8266(SerialPin.P8, SerialPin.P12, BaudRate.BaudRate115200)
            if(connectWifi(wifi_ssid, wifi_pw))
            {
                wifi_connected = true
                if(connectOrbitCloud())
                    cloud_connected = true
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



}
