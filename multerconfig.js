const Multer = require('multer');
const Path=require('path');

let  {resolve}=Path;

// 商铺图片路径
let shopWholePath=resolve(__dirname,'image').substring(2);
// 设置路径
const storage = Multer.diskStorage({
    //保存路径
    destination: function (req, file, cb) {        
        cb(null, shopWholePath)
        //注意这里的文件路径,不是相对路径，直接填写从项目根路径开始写就行了
    },
    //保存在 destination 中的文件名
    filename: function (req, file, cb) {
        let xiegang = file.mimetype.indexOf('/');
        cb(null, file.fieldname + '-' + Date.now()+'.'+file.mimetype.substring(xiegang+1))
    }
})
const upload = Multer({ storage: storage });

exports.upload=upload;