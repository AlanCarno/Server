const http=require('http');
const server=http.createServer();
const url=require('url');

server.on('request',(req,res)=>{
    let a=url.parse(req.url,true);
    const str=`您需要的参数是${a.query.a}和${a.query.c}`;
    res.setHeader("Access-Control-Allow-Origin",'*');
    res.setHeader("Access-Control-Allow-Headers",'first,second,third,content-type');
    // 为了防止中文显示乱码的问题,需要设置响应头Content-Type的值为text/html;charset=utf-8
    res.setHeader('Content-Type','text/html;charset=utf-8');
    res.end(str);
})
server.listen(8001,()=>{
    console.log("8001端口开启...")
});
