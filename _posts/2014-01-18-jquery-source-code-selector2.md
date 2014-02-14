---
layout: default
title: 学习jQuery源码-选择器2
postDate: 2014-01-18
tags: [jQuery, source code, selector]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###前言

一般没有jQuery时，我们都是用`document.getElementById("id")`等方法来选取元素。这些方法就是浏览器提供的选取元素的原生接口。

低级的浏览器至少提供这3种原生接口来获取DOM元素：

1.  根据ID获取DOM元素

        document.getElementById("id");

2.  根据标签名获取获取DOM元素(数组)

        document.getElementsByTagName("input")

3.  获取属性名获取DOM元素(数组)

    与 getElementById() 方法相似，但是它查询元素的 name 属性，而不是 id 属性。因为一个文档中的 name 属性可能不唯一，所有 `getElementsByName()` 方法返回的是元素的数组，而不是一个元素。

        document.getElementsByName("checkbox")

高级浏览器提供更多的API：

*   `document.getElementsByClassName`

*   `document.querySelector`

*   `document.querySelectorAll`

我们需要重点看一下`document.querySelectorAll`：

    document.querySelectorAll('body #text>p')
    //输出
    [<p id=​"hidden">​…​</p>​, <p>​…​</p>​]

querySelectorAll是高级的原生选择器，返回匹配DOM元素组成的数组；而我们接下来要分析的Sizzle引擎，就是**提供跟querySelectorAll一样的接口**：输入一串选择器字符串，输出符合这个选择器规则的DOM节点数组。

当然，两者不会完全一样，比如Sizzle支持jQuery自定义的`eq(0)`等非标准选择器，但标准的css选择器，两者都支持。

###jQuery选择器——Sizzle引擎入门

####必须知道的一点：CSS引擎从右向左解析 CSS 选择器

浏览器从下载文档到显示页面的过程是个复杂的过程，这里包含了重绘和重排。各家浏览器引擎的工作原理略有差别，但也有一定规则。

简单讲，通常在文档初次加载时，浏览器引擎会解析HTML文档来构建DOM树，之后根据DOM元素的几何属性构建一棵用于渲染的树。渲染树的每个节点都有大小和边距等属性，类似于盒子模型（由于隐藏元素不需要显示，渲染树中并不包含DOM树中隐藏的元素）。

当渲染树构建完成后，浏览器就可以将元素放置到正确的位置了，再根据渲染树节点的样式属性绘制出页面。由于浏览器的流布局，对渲染树的计算通常只需要遍历一次就可以完成。

<br/>

*   HTML 经过解析生成 DOM Tree，CSS 解析完毕后，需要将解析的结果与 DOM Tree 的内容一起进行分析建立一棵 Render Tree，最终用来进行绘图。Render Tree 中的元素（WebKit 中称为「renderers」，Firefox 下为「frames」）与 DOM 元素相对应，但非一一对应：一个 DOM 元素可能会对应多个 renderer，如文本折行后，不同的「行」会成为 render tree 种不同的 renderer。也有的 DOM 元素被 Render Tree 完全无视，比如 display:none 的元素。

*   在建立 Render Tree 时（WebKit 中的「Attachment」过程），浏览器就要为每个 DOM Tree 中的元素根据 CSS 的解析结果（Style Rules）来确定生成怎样的 renderer。对于每个 DOM 元素，必须在所有 Style Rules 中找到符合的 selector 并将对应的规则进行合并。选择器的「解析」实际是在这里执行的，在遍历 DOM Tree 时，从 Style Rules 中去寻找对应的 selector。

*   因为所有样式规则可能数量很大，而且绝大多数不会匹配到当前的 DOM 元素（因为数量很大所以一般会建立规则索引树），所以有一个快速的方法来判断**「这个 selector 不匹配当前元素」**就是极其重要的。

*   如果正向解析，例如「div div p em」，我们首先就要检查当前元素到 html 的整条路径，找到最上层的 div，再往下找，如果遇到不匹配就必须回到最上层那个 div，往下再去匹配选择器中的第一个 div，**回溯**若干次才能确定匹配与否，效率很低。

*   逆向匹配则不同，如果当前的 DOM 元素是 div，而不是 selector 最后的 em，那**只要一步就能排除**。只有在匹配时，才会不断向上找父节点进行验证。

*   但因为匹配的情况远远低于不匹配的情况，所以**逆向匹配**带来的优势是巨大的。同时我们也能够看出，在选择器结尾加上「*」就大大降低了这种优势，这也就是很多优化原则提到的尽量避免在选择器末尾添加通配符的原因。

**简单的来说浏览器从右到左进行查找就是为了尽早过滤掉一些无关的样式规则和元素。**

####Sizzle入门——tokenize

Sizzle解析CSS的机制，其实就是对选择器做词法分析，获取token序列，然后再进一步处理。

Sizzle的Token格式 ：

    {value:'匹配到的字符串', type:'对应的Token类型', matches:'正则匹配到的一个结构'}

给一个实例看一看解析后的token序列。输入

    var s='#text>p ';
    
    Sizzle.tokenize(s);

结果是：

![token](/images/jquery/token.png)

Token的结构是怎么样的，Token序列是什么想必一目了然。

<br/>

那么现在来看一看Sizzle的词法分析方法tokenize的源码。

    // 根据选择器分词（selector-->tokens）
    function tokenize( selector, parseOnly ) {
        var matched, match, tokens, type,
            soFar, groups, preFilters,
            cached = tokenCache[ selector + " " ];//尝试读取缓存cache

        //如果cache里边有，直接拿出来即可
        if ( cached ) {
            return parseOnly ? 0 : cached.slice( 0 );
        }

        //初始化
        soFar = selector;//soFar是表示目前还未分析的字符串剩余部分
        groups = [];//groups是最后要返回的结果，一个二维数组，存放的是每个规则对应的Token序列
        
        preFilters = Expr.preFilter;//预处理器，对匹配到的Token适当做一些调整

        //递归检测字符串
        //比如"div > p + .aaron input[type="checkbox"]"
        while ( soFar ) {
            console.log('%c 递归检测selector:','color:#f90;font-size:12px;font-weight:bold;');

            // Comma(逗号) and first run
            // 第一次运行或检测到逗号
            if ( !matched || (match = rcomma.exec( soFar )) ) {
                //rcomma以空白符或逗号开头，+任意空白符   
                //match   ====rcomma.exec(' ,   <div>');match：[" ,   "]
                console.log('%c 第一次运行或检测到逗号','color:#297;font-weight:bold;');
                if ( match ) {
                    // Don't consume trailing commas as valid
                    //如果匹配到逗号，以第一个逗号切割选择符,然后去掉前面的部分
                    soFar = soFar.slice( match[0].length ) || soFar;
                }

                //第一次运行时，往规则组groups中添加一个空数组(Token序列)，gruops变成二维数组
                //第一次运行时，matched是undefined，!matched为真，正则不会执行；如果有逗号，match不为空，则再添加，groups长度+1
                groups.push( (tokens = []) );
            }

            matched = false;
            
            // Combinators   
            // 关系选择器：[>, +, 空格, ~]
            if ( (match = rcombinators.exec( soFar )) ) {// rcombinators:开头为任意空白字符+四种关系的一种+再加任意空白字符
                //获取到匹配的字符
                matched = match.shift();

                tokens.push({//放入Token序列中
                    value: matched,
                    // Cast descendant combinators to space
                    type: match[0].replace( rtrim, " " )
                });
                //剩余还未分析的字符串需要减去这段已经分析过的
                soFar = soFar.slice( matched.length );
            }

            // Filters
            // 非关系选择器 ： TAG, ID, CLASS, ATTR, CHILD, PSEUDO, NAME
            // 将每个选择器组依次用ID,TAG,CLASS,ATTR,CHILD,PSEUDO这些正则进行匹配
            //如果通过正则匹配到了Token格式：match = matchExpr[ type ].exec( soFar )
            //然后看看需不需要预处理：!preFilters[ type ]
            //如果需要 ，那么通过预处理器将匹配到的处理一下 ： match = preFilters[ type ]( match )
            for ( type in Expr.filter ) {
                //matchExpr：不同type对应不同正则表达式，提取id，class，tag，attr，pseudo，child（nth、last），needsContext等等。
                if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
                    (match = preFilters[ type ]( match ))) ) {

                    matched = match.shift();
                    
                    tokens.push({
                        value: matched,
                        type: type,
                        matches: match
                    });
                    soFar = soFar.slice( matched.length );
                }
            }

            //如果到这里都还没matched到，说明这个选择器有错误，直接中断词法分析过程
            if ( !matched ) {
                break;//这就是Sizzle对词法分析的异常处理
            }
        }

        // Return the length of the invalid excess
        // if we're just parsing
        // Otherwise, throw an error or return tokens
        //放到tokenCache函数里进行缓存
        //如果 只需要这个接口检查选择器的合法性 （parseOnly==true），直接就返回soFar的剩余长度，倘若是大于零，说明选择器不合法
        //其余情况，如果soFar长度大于零，抛出异常；否则把groups记录在cache里边并返回
        return parseOnly ?
            soFar.length :
            soFar ?
                Sizzle.error( selector ) :
                // Cache the tokens
                tokenCache( selector, groups ).slice( 0 );
    }

**分析：**

1.  缓存构造。没有用jQuery.data来构造，原因有二：一是jQuery.data存储的数据一般都与具体的元素对应，在这里不合适；二来其实整个Sizzle引擎相对独立，用自定义的缓存有利于模块化。下面看一下缓存的构造：

        function createCache() {
            var keys = [];

            function cache( key, value ) {
                // Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
                //使用（key + " "）避免与原生原型属性冲突
                if ( keys.push( key + " " ) > Expr.cacheLength ) {
                    // Only keep the most recent entries
                    delete cache[ keys.shift() ];
                }
                // 又是巧妙的一举两得
                // 如果value存在，那么就为cache添加属性  名:key+" "  ,值:value  ，然后返回value

                //例子： key值为div；那么cache['div ']=value
                return (cache[ key + " " ] = value);
            }
            return cache;
        }

    然后，回到Sizzle模块开头的初始化一段：

        classCache = createCache(),
        tokenCache = createCache(),
        compilerCache = createCache(),

    tokenCache对应的keys数组缓存在内存中，最大长度是50（Expr定义）。通过`tokenCache[ keys[i] + " " ];`就能取到对应的token序列。

    这里用`cached = tokenCache[ selector + " " ];`来尝试获取selector对应的缓存。

2.  判断cached，存在的话

        return parseOnly ? 0 : cached.slice( 0 );

    否则继续。

3.  `while ( soFar ) {`递归检测字符串

        soFar = selector;//soFar是表示目前还未分析的字符串剩余部分
        groups = [];//groups是最后要返回的结果，一个二维数组，存放的是每个规则对应的Token序列
        preFilters = Expr.preFilter;//预处理器，对匹配到的Token适当做一些调整
        
        //递归检测字符串
        while ( soFar ) {
            //递归检测开始

            第①部分代码：
                第一次运行或检测到逗号
            

            第②部分代码：
                检测关系选择器（combinator[>, +, 空格, ~]）

            第③部分代码：
                检测非关系选择器

            第④部分代码：
                错误检查与中断
        }

    代码中添加的测试用的console语句并未删除，相信词法分析流程应该是清晰的。

    1.  `rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),`正则应该相当简单，就是检测逗号的（开始必须是逗号/空白，逗号前后可以有任意空白）。那么while循环中，**第①部分代码**就很明确了：第一次运行，往groups中压入空数组；检测到逗号，切割selector（**把逗号、空白删除掉**），同样往groups中压入空数组。

            // Comma(逗号) and first run
            // 第一次运行或检测到逗号
            if ( !matched || (match = rcomma.exec( soFar )) ) {
                //rcomma以空白符或逗号开头，+任意空白符   
                //match   ====rcomma.exec(' ,   <div>');match：[" ,   "]
                console.log('%c 第一次运行或检测到逗号','color:#297;font-weight:bold;');
                if ( match ) {
                    // Don't consume trailing commas as valid
                    // 如果匹配到逗号，以第一个逗号切割选择符,然后去掉前面的部分
                    soFar = soFar.slice( match[0].length ) || soFar;

                    console.log('%c 逗号分割，剩余选择器selector：','color:#279;');
                    console.log(soFar);
                }

                //第一次运行时，往规则组groups中添加一个空数组(Token序列)，gruops变成二维数组
                //第一次运行时，matched是undefined，!matched为真，正则不会执行；如果有逗号，match不为空，则再添加，groups长度+1
                groups.push( (tokens = []) );
            }

            matched = false;

        强调一下rcomma和字符串的分割：

            rcomma.exec(' , subSelector>tag')
            //输出
            [" , "]

        那么，**while循环中首先检测开头是不是逗号，是的话就要新添加空数组，并把开头的逗号与空白删除。当然，第一次检测的话也要添加空数组。**

        含有","的选择器就是选择器组，groups数组的长度与之对应。

    2.  **第②部分代码**：检测关系选择器（combinator），并且构造token对象压入对应的groups[i]数组。

            // 关系选择器：[>, +, 空格, ~]
            if ( (match = rcombinators.exec( soFar )) ) {// rcombinators:开头为任意空白字符+四种关系的一种+再加任意空白字符
                //获取到匹配的字符
                matched = match.shift();

                console.log('%c 关系选择器存在，是：','color:#279;');
                console.log(matched);

                tokens.push({//放入Token序列中
                    value: matched,
                    // Cast descendant combinators to space
                    type: match[0].replace( rtrim, " " )
                });
                //剩余还未分析的字符串需要减去这段已经分析过的
                soFar = soFar.slice( matched.length );
            }

        首先还是看正则：

            rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" );//  /^[\x20\t\r\n\f]*([>+~]|[\x20\t\r\n\f])[\x20\t\r\n\f]*/

            rcombinators.exec(' > p')
            //输出
            [" > ", ">"]

        rcombinators就是找出`[>, +, 空格, ~]`，然后根据值构造token，压入tokens（`groups.push( (tokens = []) );`），tokens对应当前的groups[i]。

        **照例是从剩余选择器删除刚刚检测出的部分，这里是关系选择器。**

    3.  **第③部分代码**：检测非关系选择器，并且构造token对象压入对应的groups[i]数组。

            for ( type in Expr.filter ) {
                //matchExpr：不同type对应不同正则表达式，提取id，class，tag，attr，pseudo，child（nth、last）等等。
                if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
                    (match = preFilters[ type ]( match ))) ) {

                    matched = match.shift();


                    console.log('%c 已匹配到非关系选择器：'+type+'  ，值是 '+matched,'color:#297;font-weight:bold;');
                    
                    tokens.push({
                        value: matched,
                        type: type,
                        matches: match
                    });
                    soFar = soFar.slice( matched.length );
                }
            }

        非关系选择器就复杂多了，共有Expr.filter列出的**6种**：

        **ATTR | CHILD | CLASS | ID | PSEUDO | TAG**

        每种都有对应的正则，详细看看这些正则matchExpr：

            matchExpr = {//匹配各种选择器的正则表达式
                "ID": new RegExp( "^#(" + characterEncoding + ")" ),
                "CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
                "TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
                "ATTR": new RegExp( "^" + attributes ),
                "PSEUDO": new RegExp( "^" + pseudos ),
                "CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
                    "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
                    "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
                ...
            },

            // 值为

            ATTR: /^\[[\x20\t\r\n\f]*((?:\\.|[\w-]|[^\x00-\xa0])+)[\x20\t\r\n\f]*(?:([*^$|!~]?=)[\x20\t\r\n\f]*(?:(['"])((?:\\.|[^\\])*?)\3|((?:\\.|[\w#-]|[^\x00-\xa0])+)|)|)[\x20\t\r\n\f]*\]/
            CHILD: /^:(only|first|last|nth|nth-last)-(child|of-type)(?:\([\x20\t\r\n\f]*(even|odd|(([+-]|)(\d*)n|)[\x20\t\r\n\f]*(?:([+-]|)[\x20\t\r\n\f]*(\d+)|))[\x20\t\r\n\f]*\)|)/i
            CLASS: /^\.((?:\\.|[\w-]|[^\x00-\xa0])+)/
            ID: /^#((?:\\.|[\w-]|[^\x00-\xa0])+)/
            PSEUDO: /^:((?:\\.|[\w-]|[^\x00-\xa0])+)(?:\(((['"])((?:\\.|[^\\])*?)\3|((?:\\.|[^\\()[\]]|\[[\x20\t\r\n\f]*((?:\\.|[\w-]|[^\x00-\xa0])+)[\x20\t\r\n\f]*(?:([*^$|!~]?=)[\x20\t\r\n\f]*(?:(['"])((?:\\.|[^\\])*?)\8|((?:\\.|[\w#-]|[^\x00-\xa0])+)|)|)[\x20\t\r\n\f]*\])*)|.*)\)|)/
            TAG: /^((?:\\.|[\w*-]|[^\x00-\xa0])+)/

        正则检测通过，即是非关系选择器的话，还要看是否需要预处理，需要的话就用`preFilters[ type ]( match )`进行预处理。

            preFilter: {
                "ATTR": function( match ){},
                "CHILD": function( match ) {},
                "PSEUDO": function( match ) {}
            }

        可见，对"ATTR"、"CHILD"、"PSEUDO"需要进行预处理。究竟怎么处理的？

        现在先不讲，先把tokenize的处理流程走完。

        剩余选择器经过正则等处理后的结果match，**取`matched = match.shift();`，根据matched填充tokens并再次切分选择器`soFar = soFar.slice( matched.length );`。**

    4.  **第④部分代码**：错误处理。

        matched是正则处理结果（匹配结果）。经过前三次匹配（逗号、关系、非关系），matched（匹配结果）仍是不存在，那么选择器必然非法，抛出错误。

            //如果到这里都还没matched到，说明这个选择器有错误，直接中断词法分析过程
            if ( !matched ) {
                console.log('%c 选择器异常','color:#f20;font-weight:bold;');

                break;//这就是Sizzle对词法分析的异常处理
            }

4.  while循环结束，即词法分析结束，返回结果。

        return parseOnly ?
            soFar.length :
            soFar ?
                Sizzle.error( selector ) :
                // Cache the tokens
                tokenCache( selector, groups ).slice( 0 );

    tokenize有个参数parseOnly，到这里可以解释一下意义：是否只检查选择器的合法性，是则返回soFar的长度（剩余选择器的长度），大于0表示非法。

    现在可以理解开头获取cached之后，

        if ( cached ) {
            return parseOnly ? 0 : cached.slice( 0 );
        }

    这段代码的意思了。cached存在，选择器必然合法，如果是parseOnly，返回 0 即可。

    而这里，同样首先判断parseOnly，true就返回`soFar.length`，否则判断soFar：

    *   存在，说明选择器非法，不需缓存已经解析的分词（token序列），直接抛出错误。
    *   不存在，选择器合法，缓存解析结果groups到tokenCache并返回这个结果。

            return tokenCache( selector, groups ).slice( 0 );

**分析非关系选择器的处理：**

1.  首先解释用到的正则和转换处理。

    我们知道，字符可以直接用其编码表示，比如Unicode下，数字0可以直接用'\u0030'表示。其实这就是转义字符。

    正则

        runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" )

    处理3种**转义字符**情况：

    -   `"\\."`,  `runescape.exec('\\.');//输出["\.", ".", undefined]`。
    -   `"\\\f"`,  处理四种空白符的转义形式。`runescape.exec('\\\f');//输出["\", "", ""]`。
    -   `"\\f1280"`,  处理正常的转义字符，字母范围（a-f）。`runescape.exec('\\f1280');//输出["\f1280", "f1280", undefined]`。第三种尤其注意，比如`'\\0'`是符合要求的，`'\\\u0030'`也同样符合要求，因为`'\u0030'`就是`'\0'`。

    好了，再说一下**转换函数funescape，它就是处理字符串中的转义字符**。

        funescape = function( _, escaped, escapedWhitespace ) {
        //_是正则的匹配结果，而后面的参数依次对应的是正则中对应的分组
        //escaped对应第一分组，即除"\\"之外的匹配项，escapedWhitespace对应第二分组，即空白匹配项
            //正常的BMP字符（0x0000-0xffff），相减后就是负数；
            //拓展的非BMP编码范围的字符相减之后还是正数；
            //escaped非数字结果就是NAN
            console.log(_);
            console.log(escaped);
            console.log(escapedWhitespace);
            var high = "0x" + escaped - 0x10000;
            console.log(high);
            // NaN means non-codepoint
            // Support: Firefox
            // Workaround erroneous numeric interpretation of +"0x"
            return high !== high || escapedWhitespace ?
                escaped :
                high < 0 ?
                    // BMP codepoint
                    // BMP字符，加上0x10000即可
                    String.fromCharCode( high + 0x10000 ) :
                    // Supplemental Plane codepoint (surrogate pair)
                    // 非BMP字符，没看懂 ;-)
                    String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
        };

    runescape和funescape合作完成转义字符处理：

        '\\0032'.replace(runescape,funescape); //输出 "2"
    

2.  选择器是ATTR具体分析：

    非关系选择器是遍历六种类型进行正则处理，然后看是否需要预处理（需要就处理一下），最后就是根据处理结果构造token对象，压入tokens数组，切割剩余字符串。

    attr正则：

        //可以匹配 由\\. 或 单词字符(所有字母数字下划线) 或 汉字（包括汉字标点符号），这里也可以说是全角符号组成
        characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
        //匹配属性 例如：[a="b"] [a=b] [a|='er']
        attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
        "*(?:([*^$|!~]?=)" + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]"

        "ATTR": new RegExp( "^" + attributes ),

    这个正则应该比较容易理解，以'['开始，以']'结束，中间就是合法的属性表达式，如`attr~="value"`。

    ATTR需要预处理，看看预处理。假设`'[name!="Mail"]'`，正则处理后就是

        ["[name!="Mail"]", "name", "!=", """, "Mail", undefined]

    作为match传入ATTR进行处理。

        "ATTR": function( match ) {// 
            // 处理属性名（name）中的转义字符
            match[1] = match[1].replace( runescape, funescape );

            // Move the given value to match[3] whether quoted or unquoted
            // 处理属性值外的引号，没有单/双引号，match[4]/match[5]都是undefined，否则就是match[4]就是单/双引号
            match[3] = ( match[4] || match[5] || "" ).replace( runescape, funescape );
            // match[2]就是符号（=，！=等等）
            // 如果是"~="，特殊处理，引号前后加空格。
            if ( match[2] === "~=" ) {
                match[3] = " " + match[3] + " ";
            }
            // 截取数组前5个元素返回，如
            // ["[name!="Mail"]", "name", "!=", """, "Mail"]
            return match.slice( 0, 4 );
        },

    处理后结果是：`["[name!="Mail"]", "name", "!=", "Mail"]`。

3.  选择器是CHILD具体分析：

    child正则：

        "CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
            "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
            "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),

    该正则匹配：`:nth-child(2n-3)`等各种形式。

    CHILD同样需要预处理，假设`':nth-child(-2n+3)'`，正则处理后

        [":nth-child(-2n+3)", "nth", "child", "-2n+3", "-2n", "-", "2", "+", "3"]

        1 type (only|nth|...) 2 what (child|of-type) 3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)

        4 xn-component of xn+y argument ([+-]?\d*n|) 5 sign of xn-component

        6 x of xn-component 7 sign of y-component 8 y of y-component

    作为match传入"CHILD"。

        "CHILD": function( match ) {
            // nth only等类型转为小写
            match[1] = match[1].toLowerCase();

            if ( match[1].slice( 0, 3 ) === "nth" ) {
                // nth-* requires argument
                if ( !match[3] ) {//nth-需要参数，match[3]就是其参数，不存在则报错
                    Sizzle.error( match[0] );
                }

                // numeric x and y parameters for Expr.filter.CHILD
                // remember that false/true cast respectively to 0/1
                // 取出参数 xn+y中的x（match[4]）和y（match[5]）
                // even或odd时 x为2
                // match[7]是正负号，match[8]是数字（2n+3中的3），match[5]被赋值为match[7] + match[8]
                // 但如果是odd，那么match[5]就是+true，即1
                match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
                match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

            // other types prohibit arguments
            // 不是nth，那么禁止有参数，有参数（ match[3] 存在）抛出错误
            } else if ( match[3] ) {
                Sizzle.error( match[0] );
            }

            return match;
        },

    处理后结果：`[":nth-child(-2n+3)", "nth", "child", "-2n+3", -2, 3, "2", "+", "3"]`。

4.  选择器是PSEUDO具体分析：

    pseudo正则：

        pseudos = ":(" + characterEncoding + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + attributes.replace( 3, 8 ) + ")*)|.*)\\)|)",

        "PSEUDO": new RegExp( "^" + pseudos ),

    该正则匹配：`:hover`等。

    这是最后一个需要预处理的选择器，需要预处理的attr、child、pseudo三者都比较复杂。

    假设`':not([type="submit"])'`，正则处理后

    [":not([type="submit"])", "not", "[type="submit"]", undefined, undefined, "[type="submit"]", "type", "=", """, "submit", undefined]

    作为match传入"PSEUDO"。

    **这里有一个疑问，child其实是伪类pseudo的一类，两者不是重复了吗？看"PSEUDO"的代码可知，如果是child，pseudo其实不处理，直接返回null。**

        "PSEUDO": function( match ) {
            var excess,
                unquoted = !match[5] && match[2];

            // 符合child，交给child处理就行，这里直接返回null
            if ( matchExpr["CHILD"].test( match[0] ) ) {
                return null;
            }

            // Accept quoted arguments as-is
            if ( match[3] && match[4] !== undefined ) {
                match[2] = match[4];

            // Strip excess characters from unquoted arguments
            } else if ( unquoted && rpseudo.test( unquoted ) &&
                // Get excess from tokenize (recursively)
                (excess = tokenize( unquoted, true )) &&
                // advance to the next closing parenthesis
                (excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

                // excess is a negative index
                match[0] = match[0].slice( 0, excess );
                match[2] = unquoted.slice( 0, excess );
            }

            // Return only captures needed by the pseudo filter method (type and argument)
            return match.slice( 0, 3 );
        }

    处理后结果：`[":not([type="submit"])", "not", "[type="submit"]"]`。

5.  其它选择器（ID、CLASS、TAG）

    直接正则处理，因为不需预处理，直接根据正则执行结果构造token就行了。

###结束

本篇是选择器引擎Sizzle的初步介绍，重点分析了词法解析的tokenize方法。下一章继续分析Sizzle。