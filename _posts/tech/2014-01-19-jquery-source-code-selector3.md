---
layout: default
title: 学习jQuery源码-选择器3——前半部分流程
category: tech
tags: [jQuery, source code, selector]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第4章，介绍了选择器的前半部分的流程。</p><p>本章是对前面2章的梳理归纳，一步一步来分析从jQuery.fn.init到tokenize之间发生了什么，jQuery都做了哪些处理。</p>
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###前言

上一章我们讲了词法分析，着重于分析Sizzle的tokenize方法（把选择器从字符串解析为token序列）。再上一章，我们讲了jQuery中init对选择器的初步分解，着重是各种选择器对应处理逻辑的分析。怎么说呢，上两章没有按部就班地分析我们的Sizzle到底是怎么来处理选择器的，东一榔头西一棒子，没有整体的规划。

这章开始，讲按照处理流程，一步步具体分析。首先，我们将在这一章讲一讲jQuery.fn.init是怎么调用Sizzle的，Sizzle调用后到tokenize分词前发生了什么，也顺带讲token序列的处理。

简而言之，这章是对css选择器解析流程，至少是前半部分流程的分析。


###Sizzle模块的入口——`Sizzle( selector, context, results, seed )`

为了理清流程，搞清函数间的调用逻辑，从 **<a href="/2014/01/17/jquery-source-code-selector1.html#selector1-init" id="selector3-sizzle">jQuery.fn.init</a>** 部分开始分析。

####jQuery.fn.init怎么调用Sizzle的？

选择器部分的第一章已经解释了，`jQuery.fn.init`通过
    
    // 处理 $(expr, $(...))
    else if ( !context || context.jquery ) {
        return ( context || rootjQuery ).find( selector );
    } 
    else { // 处理 $(expr, context) 等价于 $(context).find(expr)
        return this.constructor( context ).find( selector );
    }

调用了Sizzle。其实这里面跳了几步，上面的代码调用了`jQuery.fn.find`，然后通过jQuery.find最终调用Sizzle。上面的代码处理了两种情况：

*   context不存在，那么就`rootjQuery.find(selector)`；context存在且有jquery属性，那么context是jQuery对象，直接`context.find(selector)`。

*   context是字符串，直接`this.constructor( context ).find( selector );`，等价于`jQuery( context ).find( selector );`。

**其实两种情况差不多，都是最终根据context对应的jQuery对象（本身就是或者构造），调用`jQuery.fn.find`。**已经可以知道，context未指定，那么就是document对应的jQuery对象作为context。

<br/>

**分析函数`jQuery.fn.find`。**

    find: function( selector ) {
        var i,
            ret = [],
            self = this,
            len = self.length;

        console.log('jQuery.fn.find');

        if ( typeof selector !== "string" ) {
            return this.pushStack( jQuery( selector ).filter(function() {
                for ( i = 0; i < len; i++ ) {
                    if ( jQuery.contains( self[ i ], this ) ) {
                        return true;
                    }
                }
            }) );
        }

        for ( i = 0; i < len; i++ ) {
            jQuery.find( selector, self[ i ], ret );
        }

        // Needed because $( selector, context ) becomes $( context ).find( selector )
        ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
        ret.selector = this.selector ? this.selector + " " + selector : selector;
        return ret;
    },

撇开无关，核心的是：`jQuery.find( selector, self[ i ], ret );`。

很简单，就是传参调用`jQuery.find`。**self就是this，是dom元素数组，所以self[i]是dom元素。**

<br/>

**分析函数`jQuery.find`。**

    jQuery.find = Sizzle;
    jQuery.expr = Sizzle.selectors;
    jQuery.expr[":"] = jQuery.expr.pseudos;
    jQuery.unique = Sizzle.uniqueSort;
    jQuery.text = Sizzle.getText;
    jQuery.isXMLDoc = Sizzle.isXML;
    jQuery.contains = Sizzle.contains;

好吧，`jQuery.find`就是Sizzle的引用。

####Sizzle函数的分析

先不急着分析源码，可以看看`jQuery.fn.init`传过来的参数。

对应`Sizzle( selector, context, results, seed )`，

*   selector就是init传过来的selector；
*   context是DOM元素，init传过来document或者某个DOM元素；
*   results则是init传来的空数组，作为最后的结果；
*   seed为undefined，因为init未传参。

#####Sizzle函数源码

1.  初始化和参数处理

        function Sizzle( selector, context, results, seed ) {
            var match, elem, m, nodeType,
                // QSA vars
                i, groups, old, nid, newContext, newSelector;

            if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
                setDocument( context );
            }

            context = context || document;
            results = results || [];

            if ( !selector || typeof selector !== "string" ) {
                return results;
            }

            if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
                return [];
            }

    如果是init的调用，不需要这么多判断与参数处理，但Sizzle并不仅仅只被init调用，所以必须处理各种参数情况。

    比如context不存在就置为document，results不存在也要初始化成空数组。

    init调用时，context是传参的，context是document或者`context.ownerDocument`是document，第一个if判断是通不过的，不用执行`setDocument( context )`。

    这里可能会有疑问，因为setDocument有一些重要的初始化（比如Expr.find），不执行怎么办？看Sizzle闭包内处在2000多行的一行代码：

        // Initialize against the default document
        setDocument();

    即setDocument必然执行。

    *剩下的2个if是selector非法或者context非法时直接返回空数组。*

2.  **在文档是HTML（非xml），并且seed不存在时，**尝试调用原生API快速匹配节点：

        if ( documentIsHTML && !seed ) {

    *   selector是ID、CLASS、TAG时的快捷方式

            // Shortcuts
            if ( (match = rquickExpr.exec( selector )) ) {
                // Speed-up: Sizzle("#ID")
                if ( (m = match[1]) ) {
                    if ( nodeType === 9 ) {
                        elem = context.getElementById( m );
                        // Check parentNode to catch when Blackberry 4.6 returns
                        // nodes that are no longer in the document (jQuery #6963)
                        if ( elem && elem.parentNode ) {
                            // Handle the case where IE, Opera, and Webkit return items
                            // by name instead of ID
                            if ( elem.id === m ) {
                                results.push( elem );
                                return results;
                            }
                        } else {
                            return results;
                        }
                    } else {
                        // Context is not a document
                        if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
                            contains( context, elem ) && elem.id === m ) {
                            results.push( elem );
                            return results;
                        }
                    }

                // Speed-up: Sizzle("TAG")
                } else if ( match[2] ) {
                    push.apply( results, context.getElementsByTagName( selector ) );
                    return results;

                // Speed-up: Sizzle(".CLASS")
                } else if ( (m = match[3]) && support.getElementsByClassName && context.getElementsByClassName ) {
                    push.apply( results, context.getElementsByClassName( m ) );
                    return results;
                }
            }

        源码真的简单，正则也是之前讲过的rquickExpr，因此不多说了。

    *   浏览器支持`document.querySelectorAll`时调用querySelectorAll方法。

            if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
                nid = old = expando;
                newContext = context;
                newSelector = nodeType === 9 && selector;

                // qSA works strangely on Element-rooted queries
                // We can work around this by specifying an extra ID on the root
                // and working up from there (Thanks to Andrew Dupont for the technique)
                // IE 8 doesn't work on object elements
                if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
                    groups = tokenize( selector );

                    if ( (old = context.getAttribute("id")) ) {
                        nid = old.replace( rescape, "\\$&" );
                    } else {
                        context.setAttribute( "id", nid );
                    }
                    nid = "[id='" + nid + "'] ";

                    i = groups.length;
                    while ( i-- ) {
                        groups[i] = nid + toSelector( groups[i] );
                    }
                    newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
                    newSelector = groups.join(",");
                }

                if ( newSelector ) {
                    try {
                        push.apply( results,
                            newContext.querySelectorAll( newSelector )
                        );
                        return results;
                    } catch(qsaError) {
                    } finally {
                        if ( !old ) {
                            context.removeAttribute("id");
                        }
                    }
                }
            }

3.  其它时候，调用Sizzle模块自身的方法select。

    seed存在，或者浏览器不支持document.querySelectorAll时：

        return select( selector.replace( rtrim, "$1" ), context, results, seed );

###Select函数

1.  照例是初始化，重点来了，上一章讲的tokenize函数在这里被调用了。

        var i, tokens, token, type, find,
            match = tokenize( selector );//分词，获取token序列

    到这里，获取词法分析结果groups赋给match，形式是：`groups:[tokens,tokens,...], tokens:[token,token,...]`。

2.  可以看到接下来执行了

        if(!seed){...}

        compile( selector, match )();

        return results;

    这些代码暂时不解释，留到后面的章节。

###结束

本篇是选择器引擎Sizzle的前半部分流程分析，应该说是从jQuery.fn.init开始直到调用tokenize方法之间的处理逻辑、方法的详细分析，也算是前两章的总结吧。下一章继续分析Sizzle。