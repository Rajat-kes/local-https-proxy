var https = require("https"),
    httpProxy = require("http-proxy"),
    HttpProxyRules = require("http-proxy-rules");
fs = require("fs");
// Set up proxy rules instance
var proxyRules = new HttpProxyRules({
    rules: {
        "/clientbackend/(.*)/": "http://172.16.47.171/$1", // SEO Page
        // "/hotels/(.*\-hotels)/": "http://host.docker.internal:8004/seo/hotels/$1", // SEO Page
        // "/hotels/(.*\.htm)/": "http://host.docker.internal:8004/seo/hotels/$1", // SEO Page
    },
    default: "http://localhost:8000", // default target (App)
});
// Create reverse proxy instance
var proxy = httpProxy.createProxy();
// Create http server that leverages reverse proxy instance
// and proxy rules to proxy requests to different targets
const privateKey = fs.readFileSync("./certificate/server.key", "utf8");
const certificate = fs.readFileSync("./certificate/server.crt", "utf8");
const credentials = { key: privateKey, cert: certificate };
const runServer = function (req, res) {
    // a match method is exposed on the proxy rules instance
    // to test a request to see if it matches against one of the specified rules
    try {
        var target = proxyRules.match(req);
        if (target) {
            return proxy.web(req, res, {
                target: target,
            });
        }
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("The request url and path did not match any of the listed rules!");
    } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(
            "Error: The request url and path did not match any of the listed rules!"
        );
        console.log(err);
    }
};
app = https.createServer(credentials, runServer).listen(443, () => {
    console.log(`Server is running on https`);
});