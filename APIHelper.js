const request = require('request')

module.exports = {
    
    callAPI : function(url, method = 'GET', headers, body){
        return new Promise((resolve, reject) => {
            request({
                method: method,
                uri: url,
                json: true,
                headers: headers,
                body: body
            }, (err, res, body) => {
              if (err) reject(err)
              resolve(body)
            });
        })
    }
}