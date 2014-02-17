---
layout: default
title: 学习jQuery源码-Deffered
category: tech
tags: [jQuery, source code, Deffered]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第9章，主要分析jQuery.Deffered模块。</p>
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###Deffered介绍

 **API**：`jQuery.Deferred( [beforeStart] )`

**描述**：一个构造函数，返回一个链式实用对象方法来注册多个回调，回调队列，调用回调队列，并转达任何同步或异步函数的成功或失败状态。

**参数**：beforeStart | 类型: `Function( Deferred deferred )` | 一个构造函数返回之前调用的函数。

**返回**: `Deferred`

<br/>

jQuery.Deferred()构造函数创建一个新的Deferred（延迟）对象。new 运算是可选的。

一个Deferred（延迟）对象开始于pending状态。

任何回调使用deferred.then(), deferred.always(), deferred.done(), 或者 deferred.fail()添加到这个对象都是**排队等待执行**。

调用deferred.resolve() 或者 deferred.resolveWith()转换Deferred（递延）到resolved（解决）的状态，并立即执行设置中任何的doneCallbacks。

调用deferred.reject() 或者 deferred.rejectWith()转换Deferred（递延）到rejected（拒绝）的状态，并立即执行设置中任何的failCallbacks。

一旦对象进入解决或拒绝状态，它会**保持该状态**。更多回调函数仍可以添加到resolved / rejected状态的deferred对象 - **它们会以之前的参数立即执行**。

####简单使用

获取deferred对象，添加成功/失败回调函数，使用resolve或reject方法触发回调。
	
	//构建异步对象
	var defer = $.Deferred(); 

	setTimeout(function(){
	    defer.resolve( 100 );  //传入参数100
	},1000);

	var filtered  = defer.then(function( value ) {
	    return --value;
	});

	filtered.done(function( value ) {
	    console.log("打印出值",value)
	});

	//最终输出：打印出值 99 

###deferred.js源码初步分析

jQuery版本：2.0.3 | deferred.js代码量：160行左右

####整体分析

$.Deffered非常精简，就是通过jQuery.extend函数将Deffered对象添加到jQuery。

#####结构：

	jQuery.extend({
	   Deferred: function( func ) {},

	   // Deferred helper
	   when: function( subordinate /* , ..., subordinateN */ ) {}
	}

#####API罗列：

`var defer=$.Deferred();`可以发现defer共有14个方法：

![$.Deferred()](/images/jquery/defer.png "$.Deferred()的API")

`var promise=defer.promise();`可以发现promise共有8个方法：

![$.Deferred().promise()](/images/jquery/defer.promise.png "$.Deferred().promise()的API")

####$.Deffered源码流程

#####定义变量

######首先定义tuples数组：

	// 首先定义3个元组
	var tuples = [
	    // action, add listener添加监听者(回调函数), listener list监听者(回调函数)序列, final state最终状态
	    [ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
	    [ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
	    [ "notify", "progress", jQuery.Callbacks("memory") ]
    ],

**分析：**

* tuples创建三个`$.Callbacks`对象，分别表示 成功，失败，正在处理 三种状态；

* 添加回调函数/事件订阅：done，fail，progress，
	
	触发回调函数/事件发布：resolve，reject，notify，resolveWith，rejectWith，notifyWith；

* 代码优化：共性代码抽象，然后动态生成。

<br/>

######定义其它变量：

	var state = "pending", //初始状态为pending
	    deferred={}, // 最后真正返回的Deffered对象

	var promise = {
	    // 返回当前状态
	    state: function() {
	    	return state;
	    },
	    // resolve/reject时均触发
	    always: function() {
	    	deferred.done( arguments ).fail( arguments );
	    	return this;
	    },
	    then: function( /* fnDone, fnFail, fnProgress */ ) {
	    	var fns = arguments;
	    	return jQuery.Deferred(function( newDefer ) {
	    	    jQuery.each( tuples, function( i, tuple ) {
                    var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
                    // deferred[ done | fail | progress ] for forwarding actions to newDefer
                    deferred[ tuple[1] ](function() {
                        var returned = fn && fn.apply( this, arguments );
                        if ( returned && jQuery.isFunction( returned.promise ) ) {
                            returned.promise()
                                .done( newDefer.resolve )
                                .fail( newDefer.reject )
                                    .progress( newDefer.notify );
                        } else {
                            newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
                        }
                    });
                });
                fns = null;
            }).promise();
        },
        // 将promise对象所有属性合并到参数obj对象上
        promise: function( obj ) {
            return obj != null ? jQuery.extend( obj, promise ) : promise;
        }
    },

    promise.pipe = promise.then;

**分析：**

*	定义存储状态的变量state（初始值 "pending"），以及最终的返回值deferred（初始为{}）；
*	创建了一个promise对象，具有state、always、then、primise方法。
*	promise.pipe引用promise.then，这是为向后兼容。


#####核心处理

	jQuery.each( tuples, function( i, tuple ) {
	    var list = tuple[ 2 ],
            stateString = tuple[ 3 ];

        // 第一部分将回调函数存入
        // promise[ done | fail | progress ] = list.add
        promise[ tuple[1] ] = list.add;

        //如果存在deferred状态:resolved,rejected
        if ( stateString ) {
            list.add(function() {
                state = stateString;// state = [ resolved | rejected ]

            // [ reject_list | resolve_list ].disable; progress_list.lock
            // 因为要stateString存在，所以i是0、1两种。
            }, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
        }
        // ^按位异或运算符：0 ^ 1=1; 1 ^ 1=0; 所以真实结果是
        // tuples[1][2].disable，tuples[2][2].lock  
        // tuples[0][2].disable，tuples[2][2].lock

        // 第二部分很简单，给deferred对象扩充6个方法
        // deferred[ resolve | reject | notify ]
        // resolve/reject/notify 是 callbacks.fireWith，执行回调函数
        deferred[ tuple[0] ] = function() {
            deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
            return this;
        };
        //resolveWith/rejectWith/notifyWith 是 callbacks.fireWith 方法引用
        deferred[ tuple[0] + "With" ] = list.fireWith;
    });

**分析：**

对tuples的3条数据集进行处理。处理分2部分：

1.	第一部分将回调函数存入
	
	`promise[ tuple[1] ] = list.add;`
	其实就是给promise赋予3个回调函数的添加函数：

		promise.done = $.Callbacks("once memory").add
		promise.fail = $.Callbacks("once memory").add
		promise.progressl = $.Callbacks("memory").add

	如果存在deferred最终状态（stateString），即tuple的前2条数据；默认会预先向doneList,failList中的list添加三个回调函数：

	**小技巧：**^按位异或运算符：0 ^ 1 ：1；1 ^ 1 ：0；2 ^ 1 ：3，实际上第二个传参数是1、0索引对调了，所以取值是failList.disable与doneList.disable。

	<br/>

	通过stateString有值这个条件，预先向doneList,failList中的list添加三个回调函数，分别是：

	`doneList : [changeState, failList.disable, processList.lock]`
	`failList : [changeState, doneList.disable, processList.lock]`

	*  changeState 改变状态的匿名函数，deferred的状态，分为三种：pending(初始状态), resolved(解决状态), rejected(拒绝状态)。
	*  不论deferred对象最终是resolve（还是reject），在首先改变对象状态之后，都会disable另一个函数列表failList(或者doneList)。
	*  然后lock processList保持其状态，最后执行剩下的之前done（或者fail）进来的回调函数。

2.  第二部分给deferred对象扩充6个方法

	*  `resolve/reject/notify` 是 callbacks.fireWith，执行回调函数；
	*  `resolveWith/rejectWith/notifyWith` 是 callbacks.fireWith 队列方法引用。

#####返回deferred对象

	// 最后合并promise到deferred
	// Make the deferred a promise
	promise.promise( deferred );

	// Call given func if any
	if ( func ) {
	    func.call( deferred, deferred );
	}

	// All done!
	return deferred;

最后合并promise到deferred，然后返回内部的deferred对象。


###$.Deffered进一步分析

Deferred对象，内部的实现还是Callbacks对象，只是在外面再封装了一层API，供接口调用。

####deferred和promise

搞清deferred对象和promise对象的区别和联系，就搞懂了$.Deffered模块的一半。

$.Deffered模块内部定义了两个私有对象：deferred和promise。

	promise = {
		...
		promise: function( obj ) {
			return obj != null ? jQuery.extend( obj, promise ) : promise;
		}
	},
	deferred = {};

	promise.promise( deferred );

这个`promise.promise(obj)`函数干吗的呢？如果参数obj不为空，就把promise对象合并到obj并返回obj；否则返回promise对象。

上面的代码表明，通过`promise.promise(obj)`方法，把promise对象所有属性添加到deferred对象上，简单说，deferred对象是对promise对象的扩展。

**deferred就是在promise基础上添加了`resolve/reject/notify`、`resolveWith/rejectWith/notifyWith`6个方法。**

反过来说：

**promise对象就是受限的deferred对象！promise对象比deferred对象少了resolve、reject等6个触发函数！但promise对象的done、fail等同样是操作在deferred对象上！两者相关联而又有所区别。**

---

因为deferred对象合并了promise对象的属性，所以它同样有promise方法。

**注意：当obj为空时，返回的是同一个私有对象promise。**

![同一个promise对象](/images/jquery/defer.promise2.png "同一个promise对象")

####以resolve为例看触发类函数的执行流程

开头的`defer.resolve(100);`，实际上调用的是：

	// deferred[ resolve | reject | notify ]
	deferred[ tuple[0] ] = function() {
	    deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
        return this;
	};
	//resolveWith/rejectWith/notifyWith 是 callbacks.fireWith 方法引用
	deferred[ tuple[0] + "With" ] = list.fireWith;

最终，defer.resolve-->defer.resolveWith-->list.fireWith-->callbacks.fireWith-->callbacks的私有方法fire()。

####then函数：

**定义：**`deferred.then( doneFilter [, failFilter ] [, progressFilter ] )`

**参数：**

*	doneFilter | 类型: Function()，当Deferred（延迟）对象得到解决时被调用的一个函数。
*	failFilter | 类型: Function()，[可选]当Deferred（延迟）对象拒绝时被调用的一个函数。
*	progressFilter | 类型: Function()，[可选]当Deferred（延迟）对象生成进度通知时被调用的一个函数。

**描述:** 当Deferred（延迟）对象解决，拒绝或仍在进行中时，调用添加处理程序。

从jQuery 1.8开始, **方法返回一个新的promise（承诺）**，通过一个函数，可以过滤deferred（延迟）的状态和值。替换现在过时的deferred.pipe()方法。 

doneFilter 和 failFilter函数过滤原deferred（延迟）的解决/拒绝的状态和值。 

progressFilter 函数过滤器的任何调用到原有的deferred（延迟）的notify 和 notifyWith的方法。

这些过滤器函数可以返回一个新的值传递给的 promise（承诺）的.done() 或 .fail() 回调，或他们可以返回另一个观察的对象（递延，承诺等）传递给它的解决/拒绝的状态和值promise（承诺）的回调。

如果过滤函数是空，或没有指定，promise（承诺）将得到与原来值相同解决（resolved）或拒绝（rejected）。


	then: function( /* fnDone, fnFail, fnProgress */ ) {
	    var fns = arguments;

        //分别为deferred的三个callbacklist添加回调函数，根据fn的是否是函数，分为两种情况
        return jQuery.Deferred(function( newDefer ) {
            jQuery.each( tuples, function( i, tuple ) {// i从0开始

                //如果fns[ i ]是函数，那么fn=fns[ i ]；
                var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];

                // deferred[ done | fail | progress ] for forwarding actions to newDefer
                deferred[ tuple[1] ](function() {

                    //fn存在，则returned = fn.apply( this, arguments );
                    var returned = fn && fn.apply( this, arguments );
                    if ( returned && jQuery.isFunction( returned.promise ) ) {
                        returned.promise()
                            .done( newDefer.resolve )
                            .fail( newDefer.reject )
                            .progress( newDefer.notify );
                    } else {
                        newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
                    }
                });
            });
            fns = null;
        }).promise();
    },

---
我们抓住2点：

*  **构建新的**jQuery.Deferred()对象，**返回其对应的promise对象**。
*  这个新的jQuery.Deferred()对象干啥了呢？通过参数func执行某些**过滤**！

---

**按理说既然是全新的jQuery.Deferred()对象，那跟`defer.then(func)`中调用then的defer还有啥关系呢？这就要看这个func函数了。**

在Deferred构造时，支持一个参数func，即jQuery.Deferred(func)。

	// Call given func if any
	if ( func ) {
	    func.call( deferred, deferred );//把deferred作为func的参数。
	}

这个func具体到then函数，就是：`return jQuery.Deferred(function( newDefer ) {`中的`function( newDefer )`函数。相应的，newDefer就是全新的jQuery.Deferred()对象的引用。


现在来仔细分析这个`function( newDefer )`，当然，先按照开头demo一样，指定原Deferred对象为defer，新Deferred对象为filtered：

1.  第一步，分解tuples元素集
		
		jQuery.each( tuples, function( i, tuple ) {
		   //过滤函数第一步处理
		})

	在这里，其实差不多就能知道为什么全新的Deferred对象和之前的Deferred对象会有联系，因为它们操纵同一个tuples，即操纵相同的doneList、failList、processList。

2.  第二步，分别执行`deferred[ done | fail | progress ]`方法（就是add），即增加过滤函数fnDone, fnFail, fnProgress
		
		deferred[ tuple[1] ]（
			传入过滤函数
		）//过滤函数 

	**这里的deferred就是原Deferred对象defer，因为这个函数定义时，deferred代指defer。**

	---

	**所以很清楚，then函数中fnDone, fnFail, fnProgress是被添加到defer的三个callback对象了，过滤是对defer进行的。问题又来了，开头demo中的filtered，就是全新Deferred对象的promise对象，filtered.done添加的函数是怎么被添加到defer上，而不是这个全新Deferred对象？或者说，defer.resolve执行时，全新Deferred对象的doneList中的函数为什么也会执行？**


3.	第三步，仔细看第2步中传入的过滤函数。

		var returned = fn && fn.apply( this, arguments );

	**注意一点：this是defer.promise()**。原因是

		deferred[ tuple[0] ] = function() {
			deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
			return this;
		};

	this本应是deferred，然后被替换成对应的promise对象了。

	首先returned是fn（fnDone, fnFail, fnProgress）的执行结果；

	*	如果returned存在且returned.promise是函数，那么可以肯定，这个返回结果returned就是defer。

			returned.promise()
				.done( newDefer.resolve )
				.fail( newDefer.reject )
				.progress( newDefer.notify );

		这是干什么呢？returned是defer，那么，就把newDefer.resolve加到done函数队列，即defer.resolve()时(执行了doneList中函数)，那么就会执行到newDefer.resolve，就会触发newDefer的doneList执行。fail和process相同。

	*	否则，

			newDefer[ action + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );

		这是直接执行了newDefer.resolveWith等，这也解释了为什么全新Deferred对象的doneList等三callback中的函数会执行。

		this一般是defer.promise，此时，newDefer的函数执行环境this赋予`newDefer.promise()`(方便newDefer添加到doneList等队列中的函数执行`)。

		fn存在，参数就是fn执行结果（过滤的实际体现），否则，原来的参数。

<br/>

相信到这里一切清楚了。其实整个Deffered模块都很简单，唯独注意两点：

*	一个是promise对象，记住它是受限的Deffered对象即可，没有resolve这类共6个方法。
*	二是then方法。它是怎么实现过滤的？返回一个全新Deferred对象（newDefer）的promise对象。newDefer创建时有个参数func，根据定义，这个参数会在创建时执行，ok，**这个func执行了在原Deferred对象上添加包装的过滤函数。**
	
	怎么包装的？获取过滤函数fn的执行结果returned，returned是deferred对象时直接再绑定newDefer的resolve等；returned不存在或者不是deferred对象，直接触发newDefer的resolveWith等。

###结束

jQuery.Deffered() 包装了jQuery.Callbacks()，其中尤其注意then的实现，还是精巧复杂的。下一篇分析Deffered中的`when`函数。