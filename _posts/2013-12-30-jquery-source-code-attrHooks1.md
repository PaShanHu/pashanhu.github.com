---
layout: default
title: 学习jQuery源码-属性操作与其Hooks（上）
postDate: 2013-12-30
tags: [jQuery, source code, attribute, property, hooks]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
---
####声明 

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###jQuery属性操作

jQuery提供了一些快捷函数来对dom对象的属性进行增删改查操作。这一部分是比较简单的。

这一章主要分析jQuery在属性操作方面的5个API：

*   .attr()：获取匹配的元素集合中的第一个元素的属性的值或设置每一个匹配元素的一个或多个属性。
*	.prop()获取匹配的元素集中第一个元素的属性（property）值或设置每一个匹配元素的一个或多个属性。
*	.removeAttr()为匹配的元素集合中的每个元素中移除一个属性（attribute）。
*	.removeProp()为集合中匹配的元素删除一个属性（property）。
*	.val()获取匹配的元素集合中第一个元素的当前值或设置匹配的元素集合中每个元素的值。

jQuery的主要工作还是为了解决浏览器的兼容性。这部分的方法一般都有2个特点：

*	set方法和get方法一体化. 根据参数数量来判断是set还是get；
*	value可以传入一个闭包. 这个闭包的返回值才是真正的value。

####attribute和property的区别

先看一组代码：
	
	<input id="Aaron" type="checkbox" checked="checked" />
	<input id="und" type="checkbox" />

	用attr,与prop取值出input元素上的checked：

	$('#Aaron').attr('checked')  // checked 
	$('#Aaron').prop('checked')  // true

	$('#und').attr('checked')  // undefined
	$('#und').prop('checked')  // false

结论很明显，.attr()取的是节点的attribute值，.prop()取的是节点的property值。

**attribute**:特性，直接写在标签上的属性，可以通过setAttribute、getAttribute进行设置、读取。

**property**:属性，通过“.”号来进行设置、读取的属性，就跟Javascript里普通对象属性的读取差不多。

attributes是一个类数组的容器，attributes的每个数字索引以名值对(name=”value”)的形式存放了一个attribute节点。

	el.attributes[0].value   //"text"
	el.attributes[0].name   //"type"

property就是一个属性，如果把DOM元素看成是一个普通的Object对象，那么property就是一个以名值对(name="value")的形式存放在Object中的属性。

*attribute和property容易混倄的原因是，很多attribute节点还有一个相对应的property属性。*

总的来说：基本可以总结为attribute节点都是在HTML代码中可见的，而property只是一个普通的名值对属性。

####源码分析

jQuery把又长又难记的函数用外观模式包装成attr、prop，内部setAttribute、getAttribute是低级API，实现核心功能，从而隐藏了复杂细节。不过，在开始分析属性操作源码前，首先解释一下jQuery的钩子。

<h5 id="hook">钩子（hook）</h5>

详细请参照<http://blog.rodneyrehm.de/archives/11-jQuery-Hooks.html>

######钩子定义

就像你可以为jQuery写插件，jQuery核心函数也有自己的插件API（plugin API），这就是jQuery Hooks。

也就是说，jQuery提供一个API来调用用户自定义的函数，用于扩展，以便获取和设置特定属性值，主要是**attr(), prop(), val() 和css()**四函数，另外Sizzle，jQuery的selector-engine，可以对selector的伪类实现自定义。

attr(), prop(), val() ,css()四者的hooks相似：

	var someHook = {
	    get: function(elem) {
	        // obtain and return a value
	        return "something";
	    },
	    set: function(elem, value) {
	        // do something with value
	    }
	}


                
######钩子实现

*详细的钩子定义与实现以一个例子说明：*

假设有HTML5标记 `<details>`，有attribute属性 `open`，表示该元素最初可见或不可见。

已有为该元素实现的插件`$('details').details()`。`$('details').details(true)、$('details').details(false)`来open或close该`<details>`元素，以及`$('details').details('is-open')`来检查是open还是close的状态。

那么怎么用正常的`$('details').prop('open', true)`来操作呢？这就是钩子要做的或者说靠钩子来实现了。
	
	$.propHooks.open = {
	    get: function(elem) {
            if (elem.nodeName.toLowerCase() !== 'details') {
                // abort for non-<detail> elements
                return undefined;
            }
            // return the open-state as a boolean
            // (.prop() is supposed to return a boolean)
            return !!$(elem).details('is-open');
        },
        set: function(elem, value) {
            if (elem.nodeName.toLowerCase() !== 'details') {
                // abort for non-<detail> elements
                return undefined;
            }
            // convert value to a boolean and pass it to the plugin
            return $(elem).details(!!value);
        }
	};

	$.attrHooks.open = {
	    get: function(elem) {
	        if (elem.nodeName.toLowerCase() !== 'details') {
	          // abort for non-<detail> elements
	        return undefined;
	    }
	        // convert the plugin's boolean to the string "open" or empty-string
	        // (.attr() is supposed to return the actual value of the attribute)
	        return $(elem).details('is-open') ? 'open' : '';
	    },
	    set: $.propHooks.open.set
	};

**然后我们就可以用`$('details').prop('open', true);`来操作了。**

######钩子处理兼容与扩展的好处

1.	适配器这种模式对于扩展新功能非常有利；
2.	如果采用钩子处理的话，我们就省去了一大堆if else的分支判断；
3.	由于JS用对象做为表进行查找是比if条句与switch语句快很多。

#####jQuery属性操作源码

从钩子回到正题，开始属性操作的源码分析。

######attr、prop源码：
	
	var access = jQuery.access

	jQuery.fn.extend{

	attr: function( name, value ) {
	    return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},
	prop: function( name, value ) {
	    return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

很明显，具体实现是交给了access函数。但仔细看access函数，发现access函数也只是接口封装，内部对参数进行分析控制，转交由jQuery.attr/jQuery.prop具体实现。

######access函数源码：
	
	// access不仅为attr、prop所用，其它需要递归节点集合的如text、css也有用到。
	// 参数描述
	// elems ：要循环的节点集合。
	// fn ：是需要对节点进行操作的函数。
	// key ：属性名，如 "type='text'"中的type
	// value ：值，如 "type='text'"中的text
	// chainable 表示是否链式执行，对于 get 类方法，只需获得获取节点集合中的第一个元素的key对应的value，这时是不需要链式执行的。而对于 set 类方法，通常需要对整个节点集合操作。
	// emptyGet ：用于节点集合中没有元素时返回的默认值。
	// raw 为 true，表明 value 是个函数。

	jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	    var i = 0,
	        length = elems.length,
	        bulk = key == null;//key是null或undefined，则bulk=true;

	    // Sets many values
	    if ( jQuery.type( key ) === "object" ) {
	    	// key 为对象，表明这是一个类似于 { height: 100, width: 200 } 的(多个)键值对
		    // 多个键值对没法确定最终返回值是什么，所以不可能是get类方法，所以设置chainable为true
	        chainable = true;
	        for ( i in key ) {//递归调用
	            jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
	        }

	    // Sets one value
	    } else if ( value !== undefined ) {
	    	// value 存在，表明是 set 类方法，所以是链式调用，最后返回值是elems
	        chainable = true;

	        if ( !jQuery.isFunction( value ) ) {
	            raw = true; // value不是函数，设raw为true
	        }

		    // key是null或undefined
	        if ( bulk ) {
	            // Bulk operations run against the entire set
	            if ( raw ) {
	            	//value不是函数
	                fn.call( elems, value );
	                fn = null;

	            // ...except when executing function values
	            } else {//value是函数
	                bulk = fn;
	                fn = function( elem, key, value ) {
	                    return bulk.call( jQuery( elem ), value );
	                };
	            }
	        }

	        //fn存在，开始调用jQuery.attr/prop
	        //这是正式的set attribute和property
	        if ( fn ) {
	            for ( ; i < length; i++ ) {
	                fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
	            }
	        }
	    }

	    return chainable ?
	    	//chainable为true，则是链式调用（set类方法），返回的就是元素集合本身。
	        elems :

	        //如果不是链式调用，那么就是 get 类方法
	        bulk ?//bulk 为 true，说明key为null或undefined，调用fn；
	            fn.call( elems ) :

	            // key存在，判断elems的长度，长度为0，返回默认值emptyGet
	            // 长度>=1，表明存在元素，调用jQuery.attr/prop来get属性key的值
	            length ? fn( elems[0], key ) : emptyGet;
	};

**分析：**

以attr为例，attr是 return access( this, jQuery.attr, name, value, arguments.length > 1 );

正常情况下，get: $(el).attr(name) | set: $(el).attr(name,value)，name、value都非空，则最终调用的access分别是

*get：*

	access( $(el), jQuery.attr, name, undefined, false ); //chainable=false;bulk=false;length=1；
	
	return jQuery.attr($(el)[i],name,value);//真正执行getAttribute并将获取的值返回

*set：*

	access( $(el), jQuery.attr, name, value, true ); //chainable=true;bulk=false;
	
	jQuery.attr($(el)[i],name,value);//执行setAttribute
	
	return $(el) //返回$(el)以便链式调用

prop与attr基本一致，下面看attr、prop真正的实现——jQuery.attr/jQuery.prop:

######jQuery.attr源码：

	attr: function( elem, name, value ) {
	    var hooks, ret,
            nType = elem.nodeType;

        // don't get/set attributes on text, comment and attribute nodes
        // elem不存在，elem的类型是文本、注释或者属性直接退出。
        if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
            return;
        }

        // Fallback to prop when attributes are not supported
        // 当不支持attributes时，回退用prop方法
        if ( typeof elem.getAttribute === core_strundefined ) {
            return jQuery.prop( elem, name, value );
        }

        // All attributes are lowercase
        // Grab necessary hook if one is defined
        // 是否  非XML文档
        if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
            name = name.toLowerCase();
            // 如果不存在attrHooks钩子对象就尝试获取boolHook的钩子对象，
            // 否则就用nodeHook这个钩子对象
            hooks = jQuery.attrHooks[ name ] ||
                ( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
        }

        if ( value !== undefined ) {//value不是undefined
            
            // value为null就删除attr属性
            if ( value === null ) {
                jQuery.removeAttr( elem, name );

            } else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
                // 否则如果存在钩子hooks并且kooks有set方法，且set方法的返回值不为空
                // 则返回set方法的返回值
                return ret;

            } else {
                // 其他情况就直接用setAttribute设置value
                elem.setAttribute( name, value + "" );
                return value;
            }

        } else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
            // 如果value是undefined，且存在钩子hooks，hooks有get方法，
            // 返回get方法的返回值
            return ret;

        } else {
            // 其他情况（无钩子对象）就使用jQuery.find.attr（sizzle中）获取value
            ret = jQuery.find.attr( elem, name );

            // Non-existent attributes return null, we normalize to undefined
            return ret == null ?
                undefined :
                ret;
        }
    }

**分析：**

应该说jQuery.attr流程很清晰，不多解释，要细说的jQuery中的钩子。对钩子有不理解的可以看开始部分的[钩子解释](#hook)。

下面具体分析attr中用到的钩子：


	// 意思就是在使用attr(‘type’,??)设置的时候就会调用这个hooks
	// 用于处理IE6-9 input属性不可写入的问题，就是set异常
	attrHooks: {
	    type: {
            set: function( elem, value ) {
                if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
                    // Setting the type on a radio button after the value resets the value in IE6-9
                    // Reset value to default in case type is set after value during creation
                    var val = elem.value;
                    elem.setAttribute( "type", value );
                    if ( val ) {
                        elem.value = val;
                    }
                    return value;
                }
            }
        }
	},

这钩子怎么用的呢？jQuery.attr源码中可以看到

	// 获取钩子，在name="type"时，
	// hooks=jQuery.attrHooks["type"]，就是我们刚刚定义的钩子
	hooks = jQuery.attrHooks[ name ] ||
            ( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );

	if ( value === null ) {
        jQuery.removeAttr( elem, name );

    } else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
        // 拦截并使用钩子
        // 如果有钩子且有set，不在用下面的setAttribute，用钩子
        return ret;

    } else {
    	//没钩子，直接setAttribute
        elem.setAttribute( name, value + "" );
        return value;
    }

到这儿想必对jQuery的属性操作门儿清了。因为prop与attr类似，不再赘述了。不过，为完整计，对removeAttr和val函数直接上源码分析。

*removeAttr是删除attribute，源码一分析很简单。*

1.	首先是处理参数，获取要删除的属性组；
2.	如果elems是元素节点并且属性组存在，循环处理每个属性；
3.	属性用jQuery.propFix处理为正确属性名，是bool值处理一下property（删除后，对应的prop应该是false）；
4.	最后删除该attribute。

	removeAttr: function( elem, value ) {
	    var name, propName,
            i = 0,
            // value值可以是空格连接的多个value，
            // 这里通过正则匹配非空字符串，返回匹配的数组（切分value）
            attrNames = value && value.match( core_rnotwhite );

        // 如果attrNames存在且elem是元素节点
        if ( attrNames && elem.nodeType === 1 ) {
            // 遍历attrNames数组
            while ( (name = attrNames[i++]) ) {
                // 如果没有propFix对象（将name转换为正确的字符串）就直接使用name作为属性值
                propName = jQuery.propFix[ name ] || name;

                // Boolean attributes get special treatment (#10870)
                // 布尔值的属性需要特殊处理
                if ( jQuery.expr.match.bool.test( name ) ) {
                    // Set corresponding property to false
                    // 对应的prop设置为false
                    elem[ propName ] = false;
                }

                // 删除元素上的该属性
                elem.removeAttribute( name );
            }
        }
	},

*val函数时取值（参数为空），或赋值（有参数），逻辑也简单。*

1.	首先是根据是否有参数判断是get还是set；
2.	get：还是先尝试获取钩子来取值，没有的话就直接取值；
3.	set：先判断参数value是否函数，是函数先执行函数获得真正的value；
	
	然后将value处理成字符串；

	最后，先尝试获取钩子来赋值，没有就直接赋值。
<br/>
	val: function( value ) {
	    var hooks, ret, isFunction,
        // 获取节点数组（this）中的第一个元素
            elem = this[0];

        // 如果没有传参，说明是获取value值
        if ( !arguments.length ) {
            if ( elem ) {
                // 尝试获取valHooks钩子对象,
                // 如果元素不具有 元素type属性值 的钩子对象，
                // 则尝试获取 元素标签键值 的钩子对象
                hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

                if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
                    // 如果存在钩子对象且有get方法且get返回的不是undefined
                    // 则返回get方法的返回值
                    return ret;
                }

                // 否则没有相应的钩子对象，直接获取元素的value值
                ret = elem.value;

                return typeof ret === "string" ?
                    // handle most common string cases
                    ret.replace(rreturn, "") :// 如果ret是字符串，返回过滤掉制表符的字符串
                    // handle cases where value is null/undef or number
                    // 否则，如果ret为空就返回空字符串
                    ret == null ? "" : ret;// 否则返回ret
            }

            return;// 无参数，elems为空，直接退出
        }

        // 下面是有参数的情况，说明是设置value值

        // 先判断value是否为函数
        isFunction = jQuery.isFunction( value );

        // 遍历元素集，所有元素都设置value
        return this.each(function( i ) {
            var val;

            if ( this.nodeType !== 1 ) {
                return;//非元素节点，直接退出
            }

            // 如果value是函数就执行，然后给ret赋值返回的值
            if ( isFunction ) {
                val = value.call( this, i, jQuery( this ).val() );
            } else {
                val = value;
            }

            // Treat null/undefined as ""; convert numbers to string
            // 如果value为null或undefined，转化为空字符串
            if ( val == null ) {
                val = "";
            } else if ( typeof val === "number" ) {
            // 如果是数字类型也转换为字符串
                val += "";
            } else if ( jQuery.isArray( val ) ) {
            // 如果是数组类型，使用map方法返回一个新数组，新数组是把val中每个元素转化为字符串
                val = jQuery.map(val, function ( value ) {
                    return value == null ? "" : value + "";
                });
            }

            // 尝试获取钩子对象
            hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

            // If set returns undefined, fall back to normal setting
            // 如果没有钩子对象，或者钩子对象没有set方法，
            // 又或者set方法返回的值是undefined，
            // 就直接把val赋值给this.value
            if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
                this.value = val;
            }
        });
	}

###结束

jQuery的属性操作逻辑其实很简单，只是因为一个接口承担get、set两种功能可能使代码看起来有些复杂，而且为兼容性而插入的hooks也让人迷惑。下一篇继续分析属性操作，但重点转向钩子及浏览器兼容。