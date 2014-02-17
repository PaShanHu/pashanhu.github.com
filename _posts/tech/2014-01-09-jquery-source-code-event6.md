---
layout: default
title: 学习jQuery源码-事件6——事件总结
category: tech
tags: [jQuery, source code, event]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第19章，是jQuery事件模块的第6部分。</p>
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

<br/>

###事件模块

综合jQuery2.0.3和其分解出的event.js，事件模块大致情况描述：

1.  jQuery版本：2.0.3 | event.js代码量：860行（包括注释）

2.  结构：

    *   辅助方面：包括正则、简单函数（returnFalse等）、Data模块定义的 data_priv全局变量（用于缓存事件数据）；
    *   核心函数：
        *   jQuery.event对象，包括（add、remove、trigger、dispatch、handlers、fix、simulate等方法和special、fixHooks等对象）；
        *   jQuery.removeEvent函数；
        *   jQuery.Event对象（类）；
        *   挂载到jQuery.fn的核心接口，一般由用户直接调用：on、off、one、trigger、triggerHandler。
    *   未包括在event.js的一些快捷接口：一类是绑定与解绑（bind、delegate、hover），一类是快捷的事件：click、change等等。

事件模块的结构应该是比较清晰，前面几篇遗漏了快捷接口和off等没有分析，现在快速过一遍。

####事件快捷接口

1.  hover

    hover应该是很常用的方法，源码很简单：

        // 参数就是两个函数：一个是mouseenter时触发，一个是mouseout时触发
        hover: function( fnOver, fnOut ) {
            // 两个函数分别绑定到mouseenter、mouseout，一目了然。
            return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
        },

2.  快捷绑定与触发

        jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
            "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
            "change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

            // Handle event binding
            jQuery.fn[ name ] = function( data, fn ) {
                return arguments.length > 0 ?
                    this.on( name, null, data, fn ) :
                    this.trigger( name );
            };
        });

    jquery.each非常高效地为25种事件生成了快捷绑定与触发的方法。形如`jQuery.fn.click(data,fn)`，没有参数时直接触发事件，否则绑定事件。

####基于off的解绑

前几章致力于绑定的分析，这里分析一下解绑。

解绑都是交给off函数来处理的：

    unbind: function( types, fn ) {
        return this.off( types, null, fn );
    },

    undelegate: function( selector, types, fn ) {
        // ( namespace ) or ( selector, types [, fn] )
        // 参数只有selector时解绑对应节点的所有事件；否则解绑指定事件
        return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
    }

#####off源码



###事件绑定与执行流程总结

####把hack技巧以及一些重要的东西先剥离出来讲：

1.  jQuery.Event类：
    
    把原生的event对象封装成*可写的*、*属性统一的*的新event对象。jQuery.Event封装了preventDefault、stopPropagation、stopImmediatePropagation原生接口，用于阻止默认行为及停止冒泡。

2.  由jQuery.cache实现注册事件处理程序的存储。每个dom节点，如果有绑定事件，那么有且只有一个存储在data_priv私有变量上的缓存对象`elemData`。`elemData`有两个属性`events`和`handle`。**`handle`的属性值是什么？函数！重点来了，这个函数就是实际上绑定在dom节点上的唯一处理函数！**每次触发事件，实际只执行这一个函数。而这个函数**封装了`dispatch`函数**，最终分发执行每一个处理函数。

3.  namespace 命名空间机制。namespace 机制可以对事件进行更为精细的控制，开发人员可以指定特定空间的事件，删除特定命名空间的事件，以及触发特定命名空间的事件。

####现在正式描述绑定流程

这个流程我会描述的很详细，当然这与前面几篇文章必然就要有些重复了。

1.  jQuery绑定事件有多个接口，但最终是on接口。on执行了什么操作？

    1.  `on( types, selector, data, fn, /*INTERNAL*/ one )`的前半部分都在处理参数，比如types是`type-fn`键值对，则递归调用on；比如fn是false，则fn赋值为`returnFalse`函数；或者fn不存在，直接退出等等。

    2.  处理特殊的one，即one===true。仅调用一次怎么实现？==========================

    3.  处理正常情况，交给jQuery.event.add去实现真正的绑定。

2.  jQuery.event.add( elem, types, handler, data, selector )绑定事件。add是怎么绑定事件的？

    1.  前面仍然是变量定义和参数处理。

        1.  变量定义时首先要注意到：

                elemData = data_priv.get( elem );

            这是尝试获取elem节点对应的事件缓存数据。只要elem是`Data.accept`允许的（element节点、docuemnt、js对象），那么有数据则返回数据对象，无数据则返回空对象`{}`。

            **但在我再次看了Data源码几遍后，发现即使elem经过`Data.accept`判断是false，get函数仍然返回空对象`{}`。**而

                !{}  //output:false

            **所以下面这个判断在我看来是没有用的，因为elemData始终是对象（至少空对象）。这是我没弄明白的问题，在此标记一下。懂的人可以发邮件我，谢谢。**<pashanhu6@hotmail.com>

                if ( !elemData ) {
                    return;
                }

            图片展示一下这个问题。`$.privData=data_priv`，暴露data_priv；在`Data.prototype.key`函数添加了一个`console.log`：

                if ( !Data.accepts( owner ) ) {
                    console.log('位于Data.prototype.key函数的!Data.accepts( owner )判断,判断为true，return 0');
                    return 0;
                }

            ![elemData](/images/jquery/elemData_error.png)

        2.  处理参数 `handler`。

                if ( handler.handler ) {
                    handleObjIn = handler;
                    handler = handleObjIn.handler;
                    selector = handleObjIn.selector;
                }
                if ( !handler.guid ) {
                    handler.guid = jQuery.guid++;// 没有编号则添加编号
                }


            正常情况下 `handler` 就是一个函数fn。没有fn.handler和handler.guid，第一个判断括号内的语句不会执行，即handleObjIn仍是undefined；第二个会执行，即为handler添加一个guid属性。

            但另一种情况，handler并不是传统的函数，而是handleObj这种对象，分析见<a href="#handleObj">下面</a>


        3.  获取或初始化elemData的两个属性events、handle（**handle的初始化就是填充，因为它就只是一个函数。**）：

                if ( !(events = elemData.events) ) {
                    events = elemData.events = {};
                }
                if ( !(eventHandle = elemData.handle) ) {
                    eventHandle = elemData.handle = function( e ) {
                        return typeof jQuery !== core_strundefined && (!e || jQuery.event.triggered !== e.type) ?
                            jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
                            undefined;
                    };
                    eventHandle.elem = elem;
                }

            没得说，这两段很相似，都是jQuery惯用的在if判断内赋值，不存在则初始化，一举两得。events很简单，不多说，强调一下handle。handle是函数，但干嘛的？

            handle是事件触发时唯一调用的处理函数（这句后面解释），执行时首先判断：

            jQuery存在吗？e（传入的event）存在吗？jQuery.event.triggered与e.type相等吗？

            *3个都满足直接执行分发函数 `jQuery.event.dispatch.apply( eventHandle.elem, arguments )`。否则什么都不做（返回 undefined）。*

            `eventHandle.elem = elem;`也很明确，**为执行`dispatch`时指定this**。但为什么非要把elem挂载到elemData.handle上？有解释说元素没被事件直接引用，避免ie上的内存泄露。

        4.  处理空格隔开的多事件名情况。

                types = ( types || "" ).match( core_rnotwhite ) || [""];

    2.  while循环填充events属性。

        1.  `t = types.length;`取得事件名的个数，然后进入while循环。
        2.  while循环开始是一些准备工作：

                while ( t-- ) {
                    tmp = rtypenamespace.exec( types[t] ) || [];
                    type = origType = tmp[1];
                    namespaces = ( tmp[2] || "" ).split( "." ).sort();

                    if ( !type ) {
                        continue;
                    }

                    special = jQuery.event.special[ type ] || {};

                    type = ( selector ? special.delegateType : special.bindType ) || type;

                    special = jQuery.event.special[ type ] || {};

                    handleObj = jQuery.extend({
                        type: type,
                        origType: origType,
                        data: data,
                        handler: handler,
                        guid: handler.guid,
                        selector: selector,
                        needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
                        namespace: namespaces.join(".")
                    }, handleObjIn );

            1.  rtypenamespace正则就是把事件名和它的命名空间分开："mouseover.a.b" → ["mouseover.a.b", "mouseover", "a.b"]
            2.  type是事件名，namespaces是命名空间组。
            3.  type不存在，跳过这个事件名继续循环。记住，jQuery不可能去注册没事件名的事件。
            4.  有9种事件类型是由`jQuery.event.special`特殊处理的。现以 'focus'事件为例：

                `special=jQuery.event.special.focus;` special是对象，有trigger、delegateType两个属性。

            5.  根据selector存在与否重新处理type。

                selector存在吗？存在的话`type=special.delegateType;`，不存在则`type=special.bindType;`。当然，有的special不存在这两个属性，那么type还是原来的。

                我们的例子中因为有selector，是委托，所以type='focusin'。要明白，浏览器原生的focus事件不冒泡，所以jQuery用special来把type转变为'focusin'来模拟冒泡。

            6.  type有可能变了，重新获取对应的special。

                **到这里应该明白了，有的special[ type ]存在delegateType或bindType，表明这个special[ type ]并不是最终处理的，只是一个中转器。像我们的例子，special[ 'focus' ]转交给special[ 'focusin' ]处理。**

                此时`special = jQuery.event.special.focusin`；special有 'setup'、'teardown' 两个属性。

                ![focusin.png](/images/jquery/special.focusin.png)

            7.  初始化handleObj对象。讲一下needsContext属性。

                    jQuery.expr.match.needsContext: new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )

                needsContext正则还是有点复杂的，用到了正向预搜索，最终的意思是：

                或者是  任意空白字符  加  >/+/~    。如"  >"

                或者是  :even/.../last  加  (任意空白字符  加  -数字（0次或1次）  加  任意数字)

                或者是  :even/.../last

                后两种末尾不能出现   -  。

                正则的文字描述有点难，给出它的代码吧：

                    /^[\x20\t\r\n\f]*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\([\x20\t\r\n\f]*((?:-\d)?\d*)[\x20\t\r\n\f]*\)|)(?=[^-]|$)/i

                handleObj.needsContext到底干嘛的呢？selector存在并且有关系选择器或者伪类时为true。

        3.  获取events[ type ]属性——**events[ type ]若不存在，初始化为数组，并执行真正的事件绑定。**

            每个循环其实是在处理一个type，填充数据到对应的events.type属性。

                if ( !(handlers = events[ type ]) ) {
                    handlers = events[ type ] = [];
                    handlers.delegateCount = 0;

                    if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
                        if ( elem.addEventListener ) {
                            elem.addEventListener( type, eventHandle, false );
                        }
                    }
                }

            events[ type ]显然是数组，不存在就初始化为空数组`[]`，然后添加一个delegateCount属性置为0。

            **重点来了，如果没有special.setup函数或者special.setup函数执行后返回false，则直接用addEventListener绑定事件。**

            <br/>

            ---

            **到这里必须强调：真正的事件绑定就是在这一段完成的！！！**

            **1. 首先尝试用special.setup来绑定，没有或返回false则回退到addEventListener。**

            **2. 几乎所有的事件类型（type）都是用addEventListener来绑定的。因为special中仅 special.focusin special.focusout 有setup，special.focus和special.blur有机会变成前两个，因此所有的非addEventListener注册只可能这4种事件。**

            ---

            **最后要明白，addEventListener注册的是什么？是eventHandle（eventHandle = elemData.handle），这是唯一注册在元素上的事件处理函数！它的作用就是执行dispatch，从而执行真正的事件处理函数（队列）。**

            ---

            <br/>

            ---

            <br/>

        4.  while中最后几行代码

                if ( special.add ) {
                    special.add.call( elem, handleObj );
                    if ( !handleObj.handler.guid ) {
                        handleObj.handler.guid = handler.guid;
                    }
                }

                if ( selector ) {
                    handlers.splice( handlers.delegateCount++, 0, handleObj );
                } else {
                    handlers.push( handleObj );
                }

                jQuery.event.global[ type ] = true;

            最后几行在干吗？首先明白，我们是没有真正关联事件处理函数的，或者说还没有把事件处理函数推入到缓存。那该怎么做？

            如果有selector，那么就是委托，然后把handleObj插入handlers数组（位置index是delegateCount），插入后delegateCount自增1，表示，委托总数加1。

                handlers.splice( handlers.delegateCount++, 0, handleObj );
            
            没selector，不是委托，插入到最后就行了。
                    
                handlers.push( handleObj );
            
            **在这里可以看出，委托是先处理的。委托排在handlers数组前面，插入到原有委托的最后面，在所有非委托前面（通过delegateCount）定位；不是委托就直接推入到整个数组最后。**

            **还应该看出，真正的事件处理函数怎么缓存的？处理函数以handler的属性存储在handleObj对象上，当然handleObj对象上还有其它属性以便执行阶段可以用到。**

            ---

            现在看下`special.add`是什么东西？

            首先明白，如果不是`$.event.special`指定的九种事件类型，那么special就始终是空对象`{}`，这段自然不会执行，略。但现在是对于所有的`special = jQuery.event.special[ type ]`，都没有`special.add`，那么这什么情况？

            无图无真相：  
            ![special.add](/images/jquery/special2.png "special.add")

            **好吧，这又是一个问题。在我看来这是一段不会被执行的代码，但大神把它放这儿干吗？**

        5.  综合3、4可知，type这个事件从没出现过时，把eventHandle函数通过addEventListener注册到元素上。如果已经有handlers，那么说明eventHandle已经注册过，无需再次注册，把含有事件处理函数的对象handleObj推入到数组即可。

            **事件绑定终于是拎得清了：每次绑定的核心就是把handleObj对象添加到事件类型type对应的events[type]上。**

            现在就来研究下这个对象handleObj。把关于它的代码合并起来分析：

                var handleObjIn, handleObj,

                if ( handler.handler ) {
                    handleObjIn = handler;
                    handler = handleObjIn.handler;
                    selector = handleObjIn.selector;
                }
                if ( !handler.guid ) {
                    handler.guid = jQuery.guid++;
                }

                handleObj = jQuery.extend({
                    type: type,
                    origType: origType,
                    data: data,
                    handler: handler,
                    guid: handler.guid,
                    selector: selector,
                    needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
                    namespace: namespaces.join(".")
                }, handleObjIn );

            现在来看，代码已经很简单了。  
            （1）jQuery.event.add允许参数handler就是<span id="handleObj">handleObj这种对象</span>。那么把handler赋给handleObjIn，然后取事件处理函数`handler = handleObjIn.handler;`继续处理。    
            （2）handleObj有哪些属性？有处理函数handler、选择器selector等许多关键属性，dispatch执行时可以用到。可到触发执行阶段看handleObj每个属性的具体作用。

    3.  while循环结束，`jQuery.event.add`的最后一句代码：

            elem = null;

        首先明白，初始化eventHandle时设置过`eventHandle.elem = elem;`，这是dispatch函数要用的参数。

        其次，为什么要置为null？一句话，避免IE中循环引用导致的内存泄露。

<br/>
<br/>



####现在正式描述触发与执行流程

前面是绑定，自认为已经讲清楚了，现在讲触发与执行。

怎么触发？这是浏览器的工作。我们通过浏览器原生API addEventListner注册了eventHandle，即elemData.handle。事件发生时，该函数自动执行。

    eventHandle = elemData.handle = function( e ) {
        return typeof jQuery !== core_strundefined && (!e || jQuery.event.triggered !== e.type) ?
            jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
            undefined;
    };
    eventHandle.elem = elem;

浏览器会传递参数event（赋给e），也就是原生事件对象。此时如果jQuery不存在，或者e不存在，或者`jQuery.event.triggered !== e.type`，直接结束，否则执行dispatch。

前两个条件都很好理解，第3个待会说，现在开讲dispatch。

1.  eventHandle是被注册在节点上的唯一函数，事件发生时它就自动执行，自动调用dispatch。

2.  dispatch首先修复参数event，获得兼容的event对象。

        event = jQuery.event.fix( event );

3.  一堆初始化，重点注意一下handlers、special。

        handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],
        special = jQuery.event.special[ event.type ] || {};

    经过前面绑定的分析，现在理解触发执行应该不难。

    *   handlers是什么？**就是取的对应type的handleObj对象队列。然后就是从每个handleObj取得一个处理函数来执行。**
    *   special很好理解，只不过现在它的作用是特殊的执行而非绑定。

    <br/>

        args[0] = event;
        event.delegateTarget = this;

    这两行是继续修正event，并把args[0]从原生event对象替换成现在的jQuery.Event对象。

    <br/>
    
4.  用函数`jQuery.event.handlers`获取handlerQueue。

        handlerQueue = jQuery.event.handlers.call( this, event, handlers );


    调用`jQuery.event.handlers`来获取handlerQueue。现在分析`jQuery.event.handlers`：

    1.  传入的参数：event是修正过的兼容event对象，handlers是获取的handleObj队列。
    2.  初始化与参数处理：

            cur = event.target;

        cur赋为**最初**触发事件的目标DOM元素；其它初始化略。
    3.  一个if语句开始委托处理。*非常清晰：委托先处理。*

            if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") )

        delegateCount就是handlers.delegateCount，表示委托总数。cur.nodeType表示是文档节点才考虑委托，也好理解。第3个`(!event.button || event.type !== "click")`则有些难懂，但其实是一个hack，防止火狐非左键点击的冒泡。

        左键点击时，event.button是0，而`!0`是true，所以括号能屏蔽非左键点击。

        判断通过，有委托，则for循环处理委托：

            for ( ; cur !== this; cur = cur.parentNode || this ) {
                if ( cur.disabled !== true || event.type !== "click" ) {
                        matches = [];
                        for ( i = 0; i < delegateCount; i++ ) {
                            handleObj = handlers[ i ];

                            sel = handleObj.selector + " ";

                            if ( matches[ sel ] === undefined ) {
                                matches[ sel ] = handleObj.needsContext ?
                                    jQuery( sel, this ).index( cur ) >= 0 :
                                    jQuery.find( sel, this, null, [ cur ] ).length;
                            }
                            if ( matches[ sel ] ) {
                                matches.push( handleObj );
                            }
                        }
                        if ( matches.length ) {
                            handlerQueue.push({ elem: cur, handlers: matches });
                        }
                    }
                }
            }

        1.  for循环是从最初触发的节点开始，一直取cur的父节点，到this的前一个截止（直到this的直接子节点）。这里就又说明一点：**dom层次越深，事件处理函数执行优先级越高！**
        2.  一个if判断防止disabled的元素出触发点击事件。
        3.  又是一个for循环，这次是依次取出**属于委托（i从0到delegateCount-1）**的每个handleObj，与cur比较，看是否是委托绑定到cur的，是的话把该handleObj压入matches。

            **这里有个难点：怎么比较？handleObj的两个属性开始起作用了。根据needsContext、selector来获取selector对应的jQuery对象，使用index或find方法与cur比较，成功则表明这个handleObj就是属于cur的。**
        4.   内部for循环结束后，如果matches中有元素，则表示当前节点cur是有被委托的事件处理函数（队列）的，以`{ elem: cur, handlers: matches }`形式压入handlerQueue。

    4.  判断是否还有非委托事件队列，有则处理。

            if ( delegateCount < handlers.length ) {

                handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });

            }

        委托总数小于handlers(events[ type ])长度，表明有直接绑定的函数，压入handlerQueue。

    5.  返回handlerQueue。 

        **应该清楚，for循环从最初触发节点到this的子节点，一次判断每个节点是否有委托的事件函数（队列），有就以`{ elem: cur, handlers: handleObj数组 }`形式压入handlerQueue。**

        **而this节点，则要判断有没有直接绑定的处理函数，有就以`{ elem: this, handlers: handlers.slice( delegateCount ) }`形式压入handlerQueue。**

        **到这里`jQuery.event.handlers`也应该是门儿清了，就是提取一个对象数组，对象的形式是`{ elem: 节点, handlers: handleObj对象数组 }`。**


5.  获取handlerQueue之后，进入while循环开始真正的执行事件处理函数。

        i = 0;
        while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
            event.currentTarget = matched.elem;

            j = 0;
            while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {
                if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {
                    event.handleObj = handleObj;
                    event.data = handleObj.data;

                    ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
                            .apply( matched.elem, args );

                    if ( ret !== undefined ) {
                        if ( (event.result = ret) === false ) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }
                }
            }
        }

    1.  外层while很简单，就是依次取出handlerQueue队列的所有对象。遇到事件停止冒泡时（isPropagationStopped）中止。

        这个中止是本次事件处理函数没有执行的。

    2.  内层循环也简单，对照外层循环取出的对象来解释。

        外层依次取出的对象是`{ elem: 节点, handlers: handleObj对象数组 }`；

        内层就是在循环handleObj对象数组。现在具体分析：    
        （1）事件空间处理：event没有空间名或者handleObj的空间名符合event的空间名的才能进入下一步，否则不触发事件。 
        （2）事件真正执行：首先还是尝试jQuery.event.special[ handleObj.origType ].handle来执行，否则用handleObj.handler来执行。
        （3）事件执行的结果是false，那么`event.preventDefault();event.stopPropagation();`。**这里可以看一下内层循环的判断`!event.isImmediatePropagationStopped()`，可见立即停止冒泡的话处理函数不执行！**

6.  while循环结束后，还有一个hack。

        if ( special.postDispatch ) {
            special.postDispatch.call( this, event );
        }

    只有 `jQuery.event.speical.beforeunload` 有postDispatch属性，看下代码，就是修复Firefox在`event.originalEvent.returnValue`没有设置时不alert。


####详细的讲一讲jQuery.event.speical

#####都知道绑定与执行时几种事件需要special来特殊处理，那讲一讲怎么处理的。

跟special相关的绑定代码：

    special = jQuery.event.special[ type ] || {};
    type = ( selector ? special.delegateType : special.bindType ) || type;
    special = jQuery.event.special[ type ] || {};

    if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

有special.setup则执行special.setup来进行绑定。

跟special相关的触发执行代码：

    special = jQuery.event.special[ event.type ] || {};

    ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
                            .apply( matched.elem, args );

    if ( special.postDispatch ) {
        special.postDispatch.call( this, event );
    }

有special.handle则执行special.handle来执行。

1.  **beforeunload**，属性postDispatch:function，

    绑定：原生API绑定。
    执行：原生API执行，但后面执行postDispatch函数，执行`event.originalEvent.returnValue= event.result;`。

2.  **click**，属性trigger: function和属性_default: function，
    
    绑定：原生API绑定。
    执行：原生API执行。

3.  **blur**，属性delegateType: "focusout"和属性trigger:function，

    *   有selector，那么是委托，那么special=$.event.special.focusout，

    绑定：最终通过`$.event.special.focusout.setup`的`document.addEventListener( orig, handler, true );`捕获绑定。
    执行：原生API执行。
    
    *   无selector，直接绑定，type最终还是原来的type，special还是$.event.special.blur，因为没有setup属性，

    绑定：原生API绑定。
    执行：原生API执行。

4.  **focus**，属性delegateType: "focusin"和属性trigger:function，

    *   有selector，那么是委托，那么special=$.event.special.focusin，

    绑定：最终通过`$.event.special.focusin.setup`的`document.addEventListener( orig, handler, true );`捕获绑定。
    执行：原生API执行。

    *   无selector，直接绑定，type最终还是原来的type，special还是$.event.special.focus，因为没有setup属性，

    绑定：原生API绑定。
    执行：原生API执行。

5.  **focusin**，属性setup:function和属性teardown:function，很显然，通过focusin.setup来绑定，

    绑定：最终通过`$.event.special.focusin.setup`的`document.addEventListener( orig, handler, true );`捕获绑定。
    执行：原生API执行。

6.  **focusout**，属性setup:function和属性teardown:function，很显然，通过focusout.setup来绑定，

    绑定：最终通过`$.event.special.focusout.setup`的`document.addEventListener( orig, handler, true );`捕获绑定。
    执行：原生API执行。

7.  **load**，属性noBubble: true，在绑定时，

    绑定：原生API绑定。
    执行：原生API执行。

8.   **mouseenter**，属性bindType: "mouseover"，属性delegateType: "mouseover"和属性handle: function。

    绑定：原生API绑定。
    执行：special.handle()执行。

9.   **mouseleave**，属性bindType: "mouseout"，属性delegateType: "mouseout"和属性handle: function。

    绑定：原生API绑定。
    执行：special.handle()执行。

对于8、9两个，可以看看handle到底干了什么？

    handle: function( event ) {
        var ret,
            target = this,
            related = event.relatedTarget,
            handleObj = event.handleObj;

        if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
            event.type = handleObj.origType;
            ret = handleObj.handler.apply( this, arguments );
            event.type = fix;
        }
        return ret;
    }

对于某个元素elem触发了mouseenter，则target=elem。

而if判断语句是指：

1.  related不存在，就是进入或离开window；
2.  related存在但与target不同，并且related不是被target包容（即不是target的后代元素）。

那么event.type置为原来的mouseenter或mouseleave；然后执行handleObj.handler；然后把event.type重新置成对应的mouseover或mouseout。


<br/>

###结束

这篇终于写完，事件绑定执行能称得上详细回顾了一遍。有几个地方没弄明白，但基本的流程，每个函数做什么、怎么做的，应该是说清楚了。

下一篇分析jQuery的动画。