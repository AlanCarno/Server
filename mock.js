var Mock = require('mockjs')
var data = Mock.mock({
    // 属性 list 的值是一个数组，其中含有 1 到 10 个元素
    'list|10-20': [{
        // 属性 id 是一个自增数，起始值为 1，每次增 1
        'date': '@datetime',
        'name':'@cname',
        'address':'@county(true)',
    }]
})
// 输出结果
console.log(JSON.stringify(data, null, 4))