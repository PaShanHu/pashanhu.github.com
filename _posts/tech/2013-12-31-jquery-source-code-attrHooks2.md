---
layout: default
title: 学习jQuery源码-属性操作与其Hooks（下）
category: tech
tags: [jQuery, source code, attribute]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第12章，是jQuery属性操作模块分析的第2部分。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###与属性相关的jQuery Hooks

这一章主要是接着[学习jQuery源码-属性操作（上）](/2013/12/30/jquery-source-code-attrHooks1.html)，从钩子角度更深入的分析属性操作，和jQuery在浏览器兼容上的处理方法。

因为jQuery版本是2.0.3，不兼容ie6-8，钩子已经简化不少。总的来说钩子在.attr(), .prop(), .val() and .css() 四种操作中会涉及：

*   propFix
*   propHooks
*   attrHooks
*   valHooks

####jQuery.propFix对象

![jQuery.propFix](/images/jquery/propFix.png "jQuery.propFix对象")

#####jQuery.propFix源码可分为2部分：

1.  保留值属性名字修正

        propFix: {// 兼容性处理
            "for": "htmlFor",
            "class": "className"
        },

    *   class属于JavaScript保留值，因此当我们要操作元素的class属性值时，直接使用`obj.getAttribute('class')`和`obj.setAttribute('class', 'value')`可能会遭遇浏览器兼容性问题，W3C DOM标准为每个节点提供了一个可读写的className属性，作为节点class属性的映射，标准浏览器的都提供了这一属性的支持，因此，可以使用`e.className`访问元素的class属性值，也可对该属性进行重新斌值。

        而IE和Opera中也可使用`e.getAttribute('className')`和`e.setAttribute('className', 'value')`访问及修改class属性值。相比之下，`e.className`是W3C DOM标准，仍然是兼容性最强的解决办法。

    *   同理htmlFor用于读取label标签的for属性。

2.  与表单操作相关

    让钩子适配用伪代码匹配，可能是为了兼容开发者输入大小写格式不正确。比如输入错误格式：cellpadding，则替换为cellPadding（驼峰写法）。

        jQuery.each([
            "tabIndex",// tabIndex 属性可设置或返回按钮的 tab 键控制次序
            "readOnly",// readonly 属性规定输入字段为只读
            "maxLength",// maxlength 属性规定输入字段的最大长度，以字符个数计。
            "cellSpacing",// cellspacing 属性规定单元格之间的空间
            "cellPadding",// cellpadding 属性规定单元边沿与其内容之间的空白。
            "rowSpan",// rowspan 属性规定单元格可横跨的行数。
            "colSpan",// colspan 属性规定单元格可横跨的列数。
            "useMap",// HTML <img> 标签的usemap 属性将图像定义为客户端图像映射
            "frameBorder",// frameBorder 属性设置或返回是否显示框架周围的边框。
            "contentEditable" // contenteditable 属性规定是否可编辑元素的内容。
        ], function() {
            // 用each把每一个名字传递到propFix方法,key转成小写,value保存正确写法
            jQuery.propFix[ this.toLowerCase() ] = this;
        });


####jQuery.propHooks方法

propHooks['tabIndex']主要解决[tabIndex](http://www.w3help.org/zh-cn/causes/SD2021)的兼容性问题。

*tabIndex描述：*onfocus 是 HTML 中的标准事件，它在元素通过鼠标或者键盘 TAB 导航获得焦点时触发，一般应用在 A、AREA、LABEL、INPUT、SELECT、TEXTAREA、BUTTON 元素上。此事件不冒泡。

A、AREA、BUTTON、INPUT、OBJECT、SELECT 与 TEXTAREA 元素支持 tabindex 属性，这个属性指定了当前元素在当前文档中的 TAB 导航的位置，取值为 0 到 32767 的整数。

*问题：*各浏览器中，原生可以触发 onfocus 事件以及通过其 focus() 方法获得焦点的元素不相同，而在元素设置了 tabindex 属性后焦点获取情况也不相同。这个问题可能造成某些元素在某些浏览器中可以获得焦点，而在其他浏览器中没有任何反应。

*解决：*对于一般常见的可视元素，若需要元素可触发 onfocus 事件以及通过其 focus() 方法获得焦点，则应为其设置 tabindex 属性。

    var rfocusable = /^(?:input|select|textarea|button)$/i;// 正则，是否是input|select|textarea|button中一个，忽略大小写。

    propHooks: {
        tabIndex: {
            get: function( elem ) {
                return elem.hasAttribute( "tabindex" ) || rfocusable.test( elem.nodeName ) || elem.href ? //elem有tabIndex属性、可以聚焦或者是a，则返回elem.tabIndex
                    elem.tabIndex :
                    -1; //否则返回-1
            }
        }
    }

    // Support: IE9+
    // Selectedness for an option in an optgroup can be inaccurate
    if ( !jQuery.support.optSelected ) {
        jQuery.propHooks.selected = {
            get: function( elem ) {
                var parent = elem.parentNode;
                if ( parent && parent.parentNode ) {
                    parent.parentNode.selectedIndex;
                }
                return null;
            }
        };
    }

####jQuery.attrHooks方法

jQuery.attrHooks.type解决type设置的兼容性问题。

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

####jQuery.valHooks方法

#####什么是元素的value?

用 select 标签为例，如下的代码：
    
    <select id="choise">
        <option value="1">One</option>
        <option value="2">Two</option>
        <option value="3">Three</option>
        <option value="4">Four</option>
    </select>

option 真正的 value 应该是其 value 属性中的值，而不是 option 标签中间所包含的内容。

*这一点对于所有可以拥有 value 属性的标签都是相同的，即在对一个元素调用 .val() 函数时，首先取其 value 属性的值，如果没有的话，再使用其 text 值。*

#####jQuery.valHooks源码

    valHooks: {
        // option.get解决黑莓的兼容问题
        option: {
            get: function( elem ) {
                // attributes.value is undefined in Blackberry 4.7 but
                // uses .value. See #6932
                var val = elem.attributes.value;
                return !val || val.specified ? elem.value : elem.text;
            }
        },
        // select.get 解决ie兼容问题
        // select.set
        select: {
            get: function( elem ) {
                var value, option,
                    options = elem.options,
                    index = elem.selectedIndex,
                    one = elem.type === "select-one" || index < 0,
                    values = one ? null : [],
                    max = one ? index + 1 : options.length,
                    i = index < 0 ?
                        max :
                        one ? index : 0;

                // Loop through all the selected options
                for ( ; i < max; i++ ) {
                    option = options[ i ];

                    // IE6-9 doesn't update selected after form reset (#2551)
                    if ( ( option.selected || i === index ) &&
                            // Don't return options that are disabled or in a disabled optgroup
                            ( jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null ) &&
                            ( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

                        // Get the specific value for the option
                        value = jQuery( option ).val();

                        // We don't need an array for one selects
                        if ( one ) {
                            return value;
                        }

                        // Multi-Selects return an array
                        values.push( value );
                    }
                }

                return values;
            },

            set: function( elem, value ) {
                var optionSet, option,
                    options = elem.options,
                    values = jQuery.makeArray( value ),
                    i = options.length;

                while ( i-- ) {
                    option = options[ i ];
                    if ( (option.selected = jQuery.inArray( jQuery(option).val(), values ) >= 0) ) {
                        optionSet = true;
                    }
                }

                // force browsers to behave consistently when non-matching value is set
                if ( !optionSet ) {
                    elem.selectedIndex = -1;
                }
                return values;
            }
        }
    },

###结束

jQuery的属性操作的钩子和浏览器兼容性就写到这，毕竟这不是jQuery源码分析的重点，而且真要认真研究就要深入各种浏览器，花费的时间精力就会大很多，所以就此打住。下一篇分析jQuery的css操作。