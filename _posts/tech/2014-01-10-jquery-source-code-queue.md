---
layout: default
title: 学习jQuery源码-队列
category: tech
tags: [jQuery, source code, queue]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第20章，主要分析jQuery的queue（队列）。队列是jQuery动画模块的基础。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###队列Queue

接触过数据结构的应该知道，队列是一种特殊的线性表。特殊之处在于它只允许在表的前端（front）进行删除操作，而在表的后端（rear）进行插入操作，和栈一样，队列是一种操作受限制的线性表。

在队列这种数据结构中，最先插入的元素将是最先被删除的元素；反之最后插入的元素将是最后被删除的元素，因此队列又称为“先进先出”（FIFO—first in first out）的线性表。

####jQuery中的queue

jQuery关于queue的代码不多，约100多行。主要就是用`jQuery.extend`和`jQuery.fn.extend`来添加的一组函数。

#####API——jQuery.queue

**API**：jQuery.queue( element \[, queueName \] ) 

**描述**：显示在匹配的元素上的已经执行的函数列队。

**参数**：

*   element，一个用于检查附加列队的DOM元素。
*   queueName，一个含有队列名的字符串。默认是 fx，标准的动画队列。

**API**：jQuery.queue( element, queueName, newQueue )

**描述**：操作匹配元素上将要执行的函数队列。

**参数**：

*   element，一个用于检查附加列队的DOM元素。
*   queueName，一个含有队列名的字符串。默认是 fx，标准的动画队列。
*   newQueue，一个**替换**当前函数列队内容的数组。

**API**：jQuery.queue( element, queueName, callback() )

**描述**：操作匹配元素上将要执行的函数队列。

**参数**：

*   element，一个用于检查附加列队的DOM元素。
*   queueName，一个含有队列名的字符串。默认是 fx，标准的动画队列。
*   callback()，添加到列队的新函数。

#####API——jQuery.fn.delay

**API**：.delay( duration \[, queueName \] )

**描述**：设置一个延时来推迟执行队列中后续的项。

**参数**：

*   duration，一个整数，指示的毫秒数，用于设定下个队列推迟执行的时间。
*   queueName，一个含有队列名的字符串。默认是 fx，标准的动画队列。


####queue在jQuery中的作用

目前为止，queue在jQuery中主要用于动画模块。

###队列Queue源码

####实现思路


####源码分析

先撇开添加到jQuery.fn上的队列接口，看队列的实现jQuery.queue和jQuery.dequeue。

#####jQuery.queue源码

    queue: function( elem, type, data ) {
        var queue;

        if ( elem ) {
            // type默认是fx，修正为fxqueue
            type = ( type || "fx" ) + "queue";
            // 从data_priv取出elem对应type的缓存
            queue = data_priv.get( elem, type );

            // Speed up dequeue by getting out quickly if this is just a lookup
            // 可以看到dequeue调用queue时是没有data的，所以这个判断能加速dequeue时的查找
            if ( data ) {
                if ( !queue || jQuery.isArray( data ) ) {
                    // queue不存在，表明该元素原先没有队列
                    // data是数组，则data是替换原先队列的函数数组
                    // 两种情况下，都要覆盖原先队列
                    queue = data_priv.access( elem, type, jQuery.makeArray(data) );
                } else {
                    // queue存在，并且data不是数组，直接压入队列末尾
                    queue.push( data );
                }
            }
            return queue || [];
        }
    },

queue的源码很简单，注释已经阐明。可以看出，queue函数首先执行入队操作（根据data，data不存在不入队，data存在分覆盖和插入最后），然后返回最新的队列queue。

#####jQuery.dequeue源码

dequeue即queue的逆操作，它需要一个辅助函数 _queueHooks ，一并分析。

    dequeue: function( elem, type ) {
        type = type || "fx";// queue函数会自动添加"queue"，所以type只要前面的“fx”即可

        var queue = jQuery.queue( elem, type ),//首先取得queue
            startLength = queue.length,
            // 这行代码就是关键了，用shift弹出数组开头的函数（queue[0]），即实现先进先出。
            fn = queue.shift(),
            // 获取对应的queueHooks对象
            hooks = jQuery._queueHooks( elem, type ),
            next = function() {
                jQuery.dequeue( elem, type );
            };

        // If the fx queue is dequeued, always remove the progress sentinel
        // 如果fn是字符串"inprogress"，则移除后面一个真正的函数
        // fn为什么会是字符串？与动画模块有关，在后面解释
        if ( fn === "inprogress" ) {
            fn = queue.shift();
            startLength--;
        }

        if ( fn ) {

            // Add a progress sentinel to prevent the fx queue from being
            // automatically dequeued
            // 重新把字符串 "inprogress" 插入到queue数组开头，以防止fx queue被自动dequeue。
            if ( type === "fx" ) {
                queue.unshift( "inprogress" );
            }

            // clear up the last queue stop function
            // 删除hooks的stop属性
            delete hooks.stop;
            //执行将被删除的函数
            fn.call( elem, next, hooks );
        }

        if ( !startLength && hooks ) {
            // 已是空队列，hooks.empty（callback对象）触发执行，即删除缓存上的fxqueue、fxqueueHooks等。
            hooks.empty.fire();
        }
    },

    // not intended for public consumption - generates a queueHooks object, or returns the current one
    _queueHooks: function( elem, type ) {
        var key = type + "queueHooks";
        // 查找并返回这个queueHooks对象
        // 没有的话就创建一个再返回
        // 那么这个queueHooks对象是什么呢？
        // 默认有一个'empty'属性，该属性值是jQuery.Callbacks对象，该callback对象已有一个函数：data_priv.remove
        // 这个remove干嘛的？删除elem对应cache中的[ type + "queue", key ]，
        // 前一个对应标准队列fxqueue、后一个对应非标准的自定义队列
        return data_priv.get( elem, key ) || data_priv.access( elem, key, {
            empty: jQuery.Callbacks("once memory").add(function() {
                data_priv.remove( elem, [ type + "queue", key ] );
            })
        });
    }

源码还是简单的，但因为queue其实是与动画模块紧密相联的，所以更多的解释会在下一章动画模块给出。

#####jQuery.fn.queue源码

这是用户真正调用的接口。

    queue: function( type, data ) {
        var setter = 2;

        // type不是字符串，那么type就相当于function('fx',type) ，type此时是data
        if ( typeof type !== "string" ) {
            data = type;
            type = "fx";
            setter--;//setter=1,有用的参数就1个
        }
        // type是字符串，那么setter=2；此时参数长度小于2的话，就返回jQuery.queue( this[0], type );
        // type不是字符串，setter=1；判断不成立，跳过
        if ( arguments.length < setter ) {
            return jQuery.queue( this[0], type );
        }

        return data === undefined ?
        //返回this以便链式调用。
        //只有type（字符串）或没有type，已在前一个if中处理并退出。
        // type非字符串，data=type；type字符串但data存在；这两种情况都不符data === undefined，转到each中处理
            this :
            this.each(function() {
                var queue = jQuery.queue( this, type, data );

                // ensure a hooks for this queue
                jQuery._queueHooks( this, type );
                
                // 对标准fx队列的格外处理
                if ( type === "fx" && queue[0] !== "inprogress" ) {
                    // 如果queue[0]不是字符串"inprogress"，删除queue[0]（dequeue会自动执行queue[0]）
                    jQuery.dequeue( this, type );
                }
            });
    },

**分析：**

*   jQuery.fn.queue前半部分照旧是参数处理。
*   如果只是获取queue，那么`return jQuery.queue( this[0], type );`结束；
*   如果要改变queue，那么，就要`jQuery.queue( this, type, data );`，如果是fxqueue标准队列（type是fx），且queue[0]不是"inprogress"，那么就立即执行jQuery.dequeue。
**那么，如果是第一次添加函数到fx，肯定是立即执行。**

#####jQuery.fn.dequeue源码

就是对jQuery.dequeue的直接调用。

    dequeue: function( type ) {
        return this.each(function() {
            jQuery.dequeue( this, type );
        });
    },

#####jQuery.fn.delay源码

    delay: function( time, type ) {
        // 参数time处理，最终是整数
        time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
        type = type || "fx";

        return this.queue( type, function( next, hooks ) {
            // 函数核心，延迟time秒执行next（下一步的动画）
            var timeout = setTimeout( next, time );
            // dequeue中删除的stop属性出现了，干吗的？清除这个timeout
            hooks.stop = function() {
                clearTimeout( timeout );
            };
        });
    },

delay也很简单，但仔细看一下，可以理解到jQuery.dequeue中更多代码的意义。

    fn.call( elem, next, hooks );

delay中通过`this.queue`把函数添加到队列，然后dequeue调用时，通过上面一行代码传入了参数next和hooks。

delay中添加的函数就是time事件后执行next（dequeue下一个函数），可通过hooks.stop暂停执行。

#####jQuery.fn.clearQueue源码

    clearQueue: function( type ) {
        return this.queue( type || "fx", [] );
    },

很简单，也很巧妙，用空数组[]作为data更新queue，即清空queue。

#####jQuery.fn.promise源码

    // Get a promise resolved when queues of a certain type
    // are emptied (fx is the type by default)
    promise: function( type, obj ) {
        var tmp,
            count = 1,
            defer = jQuery.Deferred(),
            elements = this,
            i = this.length,
            // resolve干吗的？count自减1，为0 就defer.resolve
            resolve = function() {
                if ( !( --count ) ) {
                    defer.resolveWith( elements, [ elements ] );
                }
            };

        if ( typeof type !== "string" ) {
            obj = type;
            type = undefined;
        }
        type = type || "fx";

        while( i-- ) {
            tmp = data_priv.get( elements[ i ], type + "queueHooks" );
            if ( tmp && tmp.empty ) {
                count++;// 有一个元素就+1
                tmp.empty.add( resolve );
            }
        }
        resolve();

        //把promise对象合并到obj并返回
        return defer.promise( obj );
    }

首先要理解promise方法的作用。

默认情况下， type的值是"fx" ，这意味着返回被受理（resolve）的 Promise 对象的时机，是在所有被选中元素的动画都完成时发生的。

**用法：**

    $("div").each(function( i ) {
        $( this ).fadeIn().fadeOut( 1000 * (i+1) );
    });
     
    $( "div" ).promise().done(function() {
        console.log( " Finished! " );
    });

相比功能很清楚了，动画完成时，log一条信息。promise就是动画完成时resolve，然后执行doneList中的函数。

**代码分析：**

    count = 1,i = this.length, //初始化count为1

    // resolve就是count自减1，判断为0就执行defer.resolveWith
    resolve = function() {
        if ( !( --count ) ) {
            defer.resolveWith( elements, [ elements ] );
        }
    };

    // 每个元素都使count自增1
    // 每个元素都把resolve函数添加到对应的empty callback对象
    // 那么每个元素动画结束时，都执行resolve函数，都使得count自减1
    while( i-- ) {
        tmp = data_priv.get( elements[ i ], type + "queueHooks" );
        if ( tmp && tmp.empty ) {
            count++;// 有一个元素就+1
            tmp.empty.add( resolve );
        }
    }

    resolve();// count自减1，那么count就等于元素的数量了，最后一个元素动画执行完毕后
    // defer.resolveWith就会执行

注释的分析应该清楚了。


###结束

本篇是jQuery动画模块的前置模块队列queue，代码不多，也简单。下一篇正式分析jQuery的动画。