// import { customAlphabet } from 'nanoid/index.mjs';
// cjs导入esm（去掉了nanoid中index.js的部分全局导出后，报错消失）
// 返回promise对象，值为函数
const nanoCodeId = async () => {
    const { customAlphabet } = await import('./node_modules/nanoid/index.js');
    return customAlphabet;
};
// import('./node_modules/nanoid/index.js').then(({ customAlphabet }) => {
//     let nanoCodeId = customAlphabet('1234567890', 6);
//     return nanoCodeId;
// });

const express = require("express");
const axios = require("axios");
const bodyParser = require('body-parser');
const app = express();
const session = require('express-session');
const cors = require('cors');
const mysql = require("mysql");
const MySQLStore = require('express-mysql-session')(session);
const MulterConfig = require('./multerconfig');
const upload = MulterConfig.upload;
const fs = require('fs');
const console = require("console");
const { resolve } = require('path');

const db = mysql.createPool({
    host: "127.0.0.1",  // 数据库的IP
    user: "root",  // 登录数据库的账号
    port: "3310",   // 设置端口号，如果设置了自定义端口号就需要在这里更改
    password: "123456",  // 登录数据库的密码
    database: "carno",   // 指定要操作的数据库
});

// express-mysql-session配置（自动写入cookie数据）
let sessionStore = new MySQLStore({
    expiration: 10800000,
    createDatabaseTable: false,	//是否创建表
    schema: {
        tableName: 'login_session',	//表名
        columnNames: {		//列选项
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, db);

// 创建一个对象，{验证码：6位数字,第一次请求发送到达时间：时间戳,最大存活时间：时间戳}，超过存活时间，删除该条数据；
const codeStore = [];
// const codeObj = {
//     code: '',
//     maxAlive: 1000 * 10,
// }
const maxAlive = 1000 * 10;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// 静态托管
app.use(express.static('vuetest'));
// app.use(cors());

let clientIp = '';
let wholeURL = '';
const port = 8080;

//获取域名
app.use(function (req, res, next) {
    clientIp = req.hostname;
    wholeURL = 'http://' + clientIp + ':' + port;
    next();
})

// 自定义cors中间件设置
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", wholeURL);
    res.setHeader("Access-Control-Allow-Method", "POST, GET, PUT, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", 'content-type');
    if (req.headers.referer !== wholeURL + '/') res.send('care CSRF attack');
    else next();
})

// 判断预检请求 
app.use(function (req, res, next) {
    if (req.method == 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.send('preflight is correct');
    }
    else next();
})

// session配置
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: { secure: false, maxAge: 100000000 },
    name: 'ivan',
}));

// 测试接口1
app.all('/api/test', (req, res) => {
})
// 测试接口2
app.all('/api/testVue', (req, res) => {
    const session = req.session  // 获得session
    if (!session.time) {
        session.time = new Date();
    }
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
    res.send(session.time);
})

// 判断是否初次登录校验cookie
app.get("/api/islogin", (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (!req.session.user) {
        res.send({ loginCode: 2, msg: '验证过期' });
    } else {
        res.send({ loginCode: 1, msg: '验证成功' })
    }
});

// 登录路由
app.post("/api/login", (req, res) => {
    const usermsg = req.body;
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    db.query("SELECT username,userpwd FROM carno.user_msg;", (err, results) => {
        if (err) return console.log("Error：" + err.message);
        // foreach和some方法
        const isLogin = results.some(ele => {
            return ele.username == usermsg.username && ele.userpwd == usermsg.userpwd;
        });
        if (!isLogin) {
            res.send({ loginCode: 0, msg: '验证失败' });
        } else {
            const session = req.session;
            session.user = usermsg;
            res.send({ loginCode: 1, msg: '验证成功', username: usermsg.username });
        }
    });
});

// 注册路由(动态用户名验证)
app.post("/api/registersearch", (req, res) => {
    const usermsg = req.body;
    // res.setHeader("Access-Control-Allow-Origin", 'http://127.0.0.1:8080');
    db.query(`select count(*) from carno.user_msg where username='${usermsg.username}';`, (err, results) => {
        if (err) {
            console.log("Error：" + err.message);
        };
        if (results[0]['count(*)'] == 1) res.send({ regisCode: 0, msg: '该用户名已被注册' });
        else res.send({ regisCode: 1, msg: '该用户名可以注册' });
    });
});

// 注册路由（点击）
app.post("/api/register", (req, res) => {
    const usermsg = req.body;
    db.query(`INSERT INTO carno.user_msg (username,userpwd,usertime) VALUES ('${usermsg.username}','${usermsg.userpwd}','${usermsg.usertime}') ;`, (err, results) => {
        if (err) {
            console.log("Error：" + err.message);
            if (err.code == 'ER_DUP_ENTRY') res.send({ regisCode: 0, msg: '该用户名已被注册' }); return;
        };
        if (results.affectedRows == 1) res.send({ regisCode: 2, msg: '注册成功' }); return;
    });
});

//用户退出登录
app.get("/api/clearuser", (req, res) => {
    req.session.destroy();
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.send({ code: 0, msg: '删除成功' });
})

// 获取用户信息
app.get("/api/getuserlist", (req, res) => {
    db.query('SELECT username,usertime FROM carno.user_msg;', (err, results) => {
        if (err) {
            console.log("Error：" + err.message);
            return;
        };
        res.send(JSON.stringify(results))
    });

})

// 获取所有商家信息
app.get("/api/getshoplist", (req, res) => {
    db.query('SELECT * FROM carno.shoplist;', (err, results) => {
        if (err) {
            console.log("Error：" + err.message);
            return;
        };
        res.send(JSON.stringify(results))
    });

})

// 获取当前编辑商家信息
app.get("/api/getshoplistid", (req, res) => {
    const query = req.query;
    db.query(`SELECT * FROM carno.shoplist where shopid=${query.shopId};`, (err, results) => {
        if (err) {
            console.log("Error：" + err.message);
            return;
        };
        res.send(JSON.stringify(results))
    });

})

// 发送当前修改后商家信息(文字)

app.post("/api/sendmodifyshopmsg", (req, res) => {
    const msg = req.body;
    res.setHeader("Access-Control-Allow-Origin", 'http://127.0.0.1:8080');
    db.query(`UPDATE carno.shoplist SET shopname='${msg.shopname}',shopaddress='${msg.shopaddress}',shopintro='${msg.shopintro}',shopphone='${msg.shopphone}',shopclassify='${msg.shopclassify}' WHERE shopid=${msg.shopid};`, (err, results) => {
        if (err) {
            console.log("Error：" + err.message);
            return;
        };
        res.send('编辑成功');
    });
});

// 发送当前修改后商家信息(图片)
app.post("/api/sendmodifyshopfig", (req, res) => {
    const msg = req.body;
    db.query(`UPDATE carno.shoplist SET shopurlshop='${msg.figurl}' WHERE shopid=${msg.shopid};`, (err, results) => {
        if (err) {
            console.log("Error：" + err.message);
            return;
        };
        res.send('编辑成功,图片url更新成功');
    });
});

//接受上传的图片文件
app.post("/api/image", upload.single('file'), (req, res, next) => {
    console.log(req.file);
    next();
}, (req, res) => {
    res.send({ msg: '上传成功', path: req.file.path, code: 11 });
});

// 前台刷新重新发送编辑页面的shoplist图片
app.get("/api/getshoplistidfig", (req, res) => {
    let { url } = req.query;
    console.log(url)
    fs.readFile(url, (err, datastr) => {
        if (err) {
            return console.log(err)
        };
        res.setHeader('Content-Type', 'image/png')
        res.send(datastr);
    });
});

// 请求验证码
app.get("/api/getusercode", (req, res) => {
    nanoCodeId().then((customAlphabet) => {
        let a = (customAlphabet('1234567890', 6));
        const personalCode = a();
        codeStore.push({ code: personalCode, maxAlive: maxAlive, nowDate: +new Date() });
        res.send({ msg: '操作成功', code: personalCode });
    }).then(() => {
        console.log('验证码获取成功');
    }).catch(() => {
        throw Error('发生了错误');
    })
})
// 校验验证码
app.get("/api/testusercode", (req, res) => {
    let removeIndex;
    if (codeStore.length) {
        // 相等code的索引要么为最后一个，要么在最后一个之前；不存在的索引仅为最后一个；
        let resul = codeStore.some((ele, index) => {
            removeIndex = index;
            return ele.code == req.query["0"];
        });
        if (resul) {
            if (+new Date() - codeStore[removeIndex].nowDate <= codeStore[removeIndex].maxAlive) {
                res.send({ msg: '校验成功！', canregister: true ,overtime: false});
            }
            else {
                res.send({ msg: '验证码过期', canregister: false, overtime: true });
                // 删除指定索引数组
                codeStore.splice(removeIndex, 1);
            }
        } else {
            res.send({ msg: '验证码错误', canregister: false ,overtime: false})
        }
    } else {
        res.send({ msg: '数组无验证码', canregister: false ,overtime: false})
    }
})

app.listen(8001, () => {
    console.log("port 8001 is listening...")
})

// 错误中间件
app.use(function (err, req, res, next) {
    // res.setHeader("Access-Control-Allow-Origin", 'http://127.0.0.1:8080');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader("Access-Control-Allow-Method", "POST, GET, PUT, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", 'content-type');
    console.log('服务器发生了错误！错误为：', err.message);
    res.send(err.message);
})

