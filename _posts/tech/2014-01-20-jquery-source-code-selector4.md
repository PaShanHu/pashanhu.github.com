---
layout: default
title: 学习jQuery源码-选择器4——token序列的处理
category: tech
tags: [jQuery, source code, selector]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第5章，接着前一章来讲选择器部分的token序列处理。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###前言

上一章已经讲到获取token序列了，那么token序列是怎么处理的？token序列在哪些方法中调用？

这章就是回答这些问题，就是对Sizzle的后半部分流程分析。

在直接介入Sizzle引擎的选择器处理流程前，我们先做一些预备的工作。

###两点准备工作

####原生选择器API

#####所有的节点选择最终通过浏览器原生选择器API执行

为什么强调这一点？

因为重要。好吧，这像是废话，但我们首先应该明白**jQuery的一个原则：能让原生API处理的一定优先用原生API。**这既能提高执行效率，也是节约代码量、简化处理逻辑的必要手段。

这一点其实表现的已经很明白，在jQuery的init接口中，能用`document.getElementById`等获取的都已经优先获取过了，最后才交由Sizzle处理。而在Sizzle的接口`Sizzle(selector, context, results, seed)`接口中，又是尝试先调用`document.querySelectorAll`来获取节点，到最后才交由Sizzle自己的API处理。

#####原生选择器API的包装

选择器相关的原生API有好几个，但考虑到兼容性，其实只有3个应该是可靠的，分别是通过ID、TAG、CLASS获取节点的`document.getElementById`、`document.getElementsByTagName`、`document.getElementsByClassName`。

下面来讲一讲Sizzle对它们的包装。

上一章其实已经讲到，2000多行时执行了`setDocument();`，在setDocument函数中，就处理了对原生API的包装——Expr.find。

1.  ID：`context.getElementById`存在，那么以数组形式返回获取的元素[m]，否则返回空数组。

        Expr.find["ID"] = function( id, context ) {
            if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
                var m = context.getElementById( id );
                // Check parentNode to catch when Blackberry 4.6 returns
                // nodes that are no longer in the document #6963
                return m && m.parentNode ? [m] : [];
            }
        };

2.  CLASS：支持`getElementsByClassName`，Expr.find["CLASS"]就是包装后的函数，否则就是false。

        Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
            if ( typeof context.getElementsByClassName !== strundefined && documentIsHTML ) {
                return context.getElementsByClassName( className );
            }
        };

3.  TAG：支持`getElementsByTagName`，简单包装，否则还是先尝试`results = context.getElementsByTagName( tag );`，过滤掉注释等（只保留元素节点）返回。

    但是，如果不支持`getElementsByTagName`，`results = context.getElementsByTagName( tag );`中results不是undefined吗？

        Expr.find["TAG"] = support.getElementsByTagName ?
            function( tag, context ) {
                if ( typeof context.getElementsByTagName !== strundefined ) {
                    return context.getElementsByTagName( tag );
                }
            } :
            function( tag, context ) {
                var elem,
                    tmp = [],
                    i = 0,
                    results = context.getElementsByTagName( tag );

                // Filter out possible comments
                // 过滤，只保留元素节点
                if ( tag === "*" ) {
                    while ( (elem = results[i++]) ) {
                        if ( elem.nodeType === 1 ) {
                            tmp.push( elem );
                        }
                    }

                    return tmp;
                }
                return results;
            };

####关系选择器

节点与节点之间有4种关系：

*   祖先和后代 —— 空格
*   父子 —— >
*   邻近兄弟 —— +
*   普通兄弟 —— ~

同样，处理关系选择器的也属于Expr对象，是Expr.relative：

    relative: {
        ">": { dir: "parentNode", first: true },
        " ": { dir: "parentNode" },
        "+": { dir: "previousSibling", first: true },
        "~": { dir: "previousSibling" }
    },

**first属性，**用来标识两个节点的**“紧密”**程度，例如父子关系和临近兄弟关系就是紧密的。

###获取token序列后的处理流程

我们在选择器这部分的开头就讲过解析css选择器是从右向左的，这是效率最高的方式，而Sizzle也同样遵循这个原则。在获取token序列后，Sizzle就是从右向左分析处理这个token序列的。

还是以一个例子开始。选择器：`div > p + div.Aaron input[type="checkbox"] `

<span id="tokens-demo">tokenize处理后</span>：

    [Array[9]]

    Array[0]:{matches: ["div"],type: "TAG",value: "div"},
    Array[1]:{type: ">",value: " > "},
    ...
    Array[5]:{matches: ["Aaron"],type: "CLASS",value: ".Aaron"}
    Array[6]:{type: " ",value: " "},
    Array[7]:{matches: ["input"],type: "TAG",value: "input"}
    Array[8]:{matches: ["type","=","checkbox"],type: "ATTR",value: "[type="checkbox"]"}

怎么处理这个token序列呢？先撇开源码讲一讲：

1.  首先获取种子集seed

    到这里我们应该已经知道，**（1）Expr.find是最终实现接口（原生API包装），且只支持ID、TAG、CLASS三种；（2）选择器从右向左解析。**

    按从右向左的原则分析处理token序列：

    *   首先检查Array[8]，这是`type: "ATTR"`，Expr.find是不支持的，那怎么办？

    *   先**跳过**，检查`Array[7]:{matches: ["input"],type: "TAG",value: "input"},`，是TAG，是Expr.find三种里面的一种，执行`Expr.find['TAG']`函数，取得一个数组。

    `Expr.find['TAG']`是对`getElementsByTagName`的包装，返回值是集合（匹配节点元素的数组）——我们把这个集合叫做**seed（种子集）**。

    按理说，应该继续往左匹配，但这样的效率已经不高，所以暂停下来，具体处理在下一章说。

2.  获取seed后开始整理

    TAG标签input已经处理过，现在开始整理：

    1.  从选择器中剔除input，选择器变为：

            'div > p + div.Aaron [type="checkbox"]'

    2.  token序列中对应input的token对象剔除，所以也只剩8个token对象

    3.  我们有一个seed集合

            [<input type=​"text">​, <input type=​"checkbox" name=​"readme">​]

    seed中有2个元素，最终的结果就是从它们中选出（全匹配就全部都是）。

####接上一章的select函数继续分析

#####select中`if ( !seed )`段分析

上一章讲到初始化时`match= tokenize( selector );`获取token序列，那么接下来就是如上面所说的获取seed了：

    if ( !seed ) {//没有指定初始集合seed
        // Try to minimize operations if there is only one group
        // 单个选择器（即没有逗号），div, p，可以特殊优化一下
        if ( match.length === 1 ) {

            // Take a shortcut and set the context if the root selector is an ID
            tokens = match[0] = match[0].slice( 0 );//取出选择器Token序列

            //如果第一个selector是id，我们可以设置context快速查找
            if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
                    support.getById && context.nodeType === 9 && documentIsHTML &&
                    Expr.relative[ tokens[1].type ] ) {
                context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];

                if ( !context ) {
                    //如果context这个元素（selector第一个id选择器）都不存在，就不用查找，返回空
                    return results;
                }
                //整理选择器、token序列
                selector = selector.slice( tokens.shift().value.length );
            }

            // Fetch a seed set for right-to-left matching
            // 其中： "needsContext"= new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
            // 表示selector如果有一些结构伪类，则需要用另一种方式过滤，在之后文章再详细剖析。
            // 有伪类，i置为0，while循环不执行。
            // 无伪类就从最后一条规则开始，先找出seed集合
            i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;

            //从右向左边查询
            while ( i-- ) {
                token = tokens[i];

                // Abort if we hit a combinator
                // 如果遇到关系选择器则中止 //> + ~ 空
                if ( Expr.relative[ (type = token.type) ] ) {
                    break;
                }

                /*
                  先看看有没有搜索器find，搜索器就是浏览器一些原生的取DOM接口，即
                  Expr.find = {
                    'ID'    : context.getElementById,
                    'CLASS' : context.getElementsByClassName,
                    'TAG'   : context.getElementsByTagName
                  }
                */
                //如果是:first-child等伪类，就没有对应的搜索器，此时会提取前一个token
                if ( (find = Expr.find[ type ]) ) {
                    // Search, expanding context for leading sibling combinators
                    if ( (seed = find(
                        token.matches[0].replace( runescape, funescape ),
                        rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
                    )) ) {

                        // If seed is empty or no tokens remain, we can return early
                        //如果搜到了seed，把最后一条规则token去掉
                        tokens.splice( i, 1 );
                        selector = seed.length && toSelector( tokens );
                        
                        //如果当前剩余选择器为空，则可以提前返回结果。
                        if ( !selector ) {
                            push.apply( results, seed );
                            return results;
                        }

                        break;//已经找到了符合条件的seed集合，此时前边还有其他规则，跳出去
                    }
                }
            }
        }
    }

**分析：**

1.  只有选择器没有逗号，即单个选择器的情况下才尝试优化。
2.  如果selector开头是ID，则优化：根据ID获取节点，替换成context。
3.  selector有伪类时，i是0，无法优化了，无法获取seed。
4.  selector不是伪类时，i就是tokens.length，可以在while循环中尝试获取seed。

其实这段`if ( !seed )`逻辑很清晰，代码也不难理解，就是`while ( i-- )`这个循环注意一下。

*i--说明是从右向左处理；如果token[i]是关系选择器则终止，即不获取seed；如果是Expr.find中的3种（ID、CLASS、TAG）才获取seed，否则检查左边的token。*

**强调一点：**遇到关系选择器立即终止，不获取seed！因为seed是用来最终筛选的dom元素集合，如果遇到关系选择器，**说明关系选择器右边的选择器没有对应的dom元素，说明选择器非法**！

<br/>

还是重点看看seed获取代码：
    
    if ( (find = Expr.find[ type ]) ) {
    ---
        // Search, expanding context for leading sibling combinators
        if ( (seed = find(
            token.matches[0].replace( runescape, funescape ),
            rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
        )) ) {
    ---

            // If seed is empty or no tokens remain, we can return early
            //如果搜到了seed，把最后一条规则token去掉
            tokens.splice( i, 1 );
            selector = seed.length && toSelector( tokens );
    ---      
            //如果当前剩余选择器为空，则可以提前返回结果。
            if ( !selector ) {
                push.apply( results, seed );
                return results;
            }

            break;//已经找到了符合条件的seed集合，此时前边还有其他规则，跳出去
        }
    }

**按顺序分析：**

*   首先find存在才去取seed，不存在则集训while循环（i--，即取左边的token）。

*   用find获取seed，find第一个参数是ID/TAG/CLASS的值，这里取[token.matches\[0\]](#tokens-demo)后转换*转义字符*；第二个参数是表达式 `rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context` 的执行结果，设结果为RESULT，这里稍微有点复杂，另起一段讲。

    *   `rsibling = /[+~]/`，rsibling很简单，就是验证是不是 + 或者 ~ ；
    *   testContext也是简单的函数，验证context是不是元素节点，返回bool值：

            function testContext( context ) {
                return context && typeof context.getElementsByTagName !== strundefined && context;
            }

    那么，**如果（1）`tokens[0].type`是兄弟节点（普通/邻近），（2）并且context的父节点是元素节点，那么&&运算结果是true，此时RESULT就是true。如果有一个不符合，那么RESULT就是context。**

    **如果传给第二个参数的值是true，那么seed就是undefined了。但问题是如果是关系选择器，早就break终止查找seed了，所以我认为这个判断有问题。**

*   找到seed后整理token序列和选择器。

    **请注意：seed如果为空，selector就被设置为空，方便下面快速退出。**

*   selector长度为0，那么就能提前结束。

#####select中最后几行代码

    compile( selector, match )(
        seed,
        context,
        !documentIsHTML,
        results,
        rsibling.test( selector ) && testContext( context.parentNode ) || context
    );

    return results;

可见处理核心就是compile函数了，最后再返回结果。compile放到下一章分析。

###结束

本篇着重讲token序列的处理。下一章将重点分析compile函数及其它重要函数。