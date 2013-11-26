---
layout: markdown
title: Markdown学习与使用
postDate: 2013-11-19
---
<header class='header'>
	<h1 class='title'>{{ page.title }}</h1>
</header>
<section class='post-info'>
	<div class='tags'>
		<span>markdown</span>
		<span>学习笔记</span>
	</div>
	<div class='time'><span>{{ page.postDate }}</span></div>
</section>

####说明

感谢[@riku](http://wowubuntu.com/markdown/)翻译的简体中文版 **Markdown 语法说明** 。

###Markdown是什么？

Markdown 是一种易读易写的纯文本写作语言，以 HTML 发布，干净、通行。 

一份使用 Markdown 格式撰写的文件应该可以直接以纯文本发布，并且看起来不会像是由许多标签或是格式指令所构成。Markdown 语法受到一些既有 text-to-HTML 格式的影响，包括 Setext、atx、Textile、reStructuredText、Grutatext和EtText，而最大灵感来源其实是纯文本电子邮件的格式。

总之， Markdown 的语法全由一些符号所组成，这些符号经过精挑细选，其作用一目了然。比如：在文字两旁加上星号，看起来就像*强调*。Markdown的列表看起来，嗯，就是列表。Markdown的区块引用看起来就真的像是引用一段文字，就像你曾在电子邮件中见过的那样。

####兼容 HTML

Markdown 不是想要取代HTML，甚至也没有要和它相近，它的语法种类很少，只对应 HTML 标记的一小部分。
HTML以及很容易书写了，Markdown 的理念是，能让文档更容易读、写和随意改。HTML 是一种发布的格式，Markdown是一种书写的格式。就这样，Markdown的格式语法只涵盖纯文本可以涵盖的范围。

*明确3点：*

1.  不在Markdown范围内的标签，可在文档中直接用html写。
2.  html的区块元素---比如`<div>`、`<table>`、`<pre>`、`<p>`等标签，必须前后加空行与其它内容分隔开；开始标签与结束标签不能用制表符或空格来缩进。
3.  html的区段（行内）标签如`<span>`、`<cite>`、`<del>`、`<a>`、`<img>`可以在Markdown的段落、列表或是标题里随意使用。可以不用Markdown格式，直接用html标签格式化。

*注意2点：*

*  在 HTML 区块标签间的 Markdown 格式语法将不会被处理。比如，你在 HTML 区块内使用 Markdown 样式的*强调*会没有效果。
*  Markdown 语法在 HTML 区段标签间是有效的。

####特殊字符自动转换

html中，有两个字符需要特殊处理： < 和 & 。 < 符号用于起始标签，& 符号则用于标记 HTML 实体，如果你只是想要显示这些字符的原型，你必须要使用实体的形式，像是 `&lt;` 和 `&amp;`。

Markdown中，你可以自然书写，markdown会为你处理。如果你写`<span></span>`，那么<就会转化成 `&lt;`；但写4 < 5，markdown保持不动。

需要注意：*code 范围内，不论是行内还是区块， < 和 & 两个符号都一定会被转换成 HTML 实体。*

###区块元素

####段落和换行

Markdown 段落是由一个或多个连续的文本行组成，它的前后要有一个以上的空行（空行中可有空格和制表符）。    
Markdown 允许段落内的强迫换行（此句即强迫换行）：在插入处先按入两个以上的空格然后回车。


####代码区块

和程序相关的写作或是标签语言原始码通常会有已经排版好的代码区块，通常这些区块我们并不希望它以一般段落文件的方式去排版，而是照原来的样子显示，Markdown 会用`<pre>`和`<code>`标签来把代码区块包起来。

在Markdown中建立代码区块很简单，只要简单地缩进 *4个空格* 或是 *1个制表符* 就可以。当然，用反引号`` (`) ``包起代码也可以。如果要在代码区段内插入反引号，你可以用多个反引号来开启和结束代码区段；此外，代码区段的起始和结束端都可以放入一个空白，起始端后面一个，结束端前面一个，这样你就可以在区段的一开始就插入反引号。

------------------------------

	这是一个普通段落：

	    这是一个代码区块。

Markdown 会转换成：

	<p>这是一个普通段落：</p>

	<pre><code>这是一个代码区块。
	</code></pre>

这个每行一阶的缩进（4 个空格或是 1 个制表符），都会被移除，例如：

	Here is an example of AppleScript:

	    tell application "Foo"
	        beep
	    end tell

会被转换为：

	<p>Here is an example of AppleScript:</p>

	<pre><code>tell application "Foo"
	    beep
	end tell
	</code></pre>

开始阶段插入反引号：
A single backtick in a code span: `` ` ``

-----------------------------------

一个代码区块会一直持续到没有缩进的那一行（或是文件结尾）。

*  在代码区块里面， & 、 < 和 > 会自动转成HTML实体，这样的方式让你非常容易使用Markdown插入范例用的 HTML 原始码，只需要复制贴上，再加上缩进就可以了。

*  代码区块中，一般的 Markdown 语法不会被转换，像是星号便只是星号，这表示你可以很容易地以 Markdown 语法撰写 Markdown 语法相关的文件。

###分隔线

在一行中用三个以上的星号、减号、底线来建立一个分隔线，行内不能有其他东西。你也可以在星号或是减号中间插入空格。下面每种写法都可以建立分隔线：


	* * *

	***

	*****

	- - -

	---------------------------------------

####区块引用 Blockquotes

Markdown 标记区块引用是使用类似 email 中用 > 的引用方式，即像是你自己先断好行，然后在每行前加入>。引用的区块内也可以使用其他的 Markdown 语法，包括标题、列表、代码区块等。

	> This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
	> consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
	> Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.
	> 
	> Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
	> id sem consectetuer libero luctus adipiscing.
	>>嵌套引用

输出

> This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
> consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
> Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.
> 
> Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
> id sem consectetuer libero luctus adipiscing.
>>嵌套引用

####列表

Markdown 支持有序列表和无序列表。

无序列表使用星号、加号或是减号作为列表标记：

	*   Red
	*   Green
	*   Blue
	等同于：

	+   Red
	+   Green
	+   Blue
	也等同于：

	-   Red
	-   Green
	-   Blue

有序列表则使用数字接着一个英文句点，*很重要的一点是，你在列表标记上使用的数字并不会影响输出的 HTML 结果*：

	1.  Bird
	2.  McHale
	3.  Parish

	1.  Bird
	1.  McHale
	1.  Parish

列表项目标记通常是放在最左边，但是其实也可以缩进，最多 3 个空格，项目标记后面则一定要接着至少一个空格或制表符。

列表项目可以包含多个段落，每个项目下的段落都必须缩进 4 个空格或是 1 个制表符：

	1.  This is a list item with two paragraphs. Lorem ipsum dolor
	    sit amet, consectetuer adipiscing elit. Aliquam hendrerit
	    mi posuere lectus.

	    Vestibulum enim wisi, viverra nec, fringilla in, laoreet
	    vitae, risus. Donec sit amet nisl. Aliquam semper ipsum
	    sit amet velit.

	2.  Suspendisse id sem consectetuer libero luctus adipiscing.

####区段元素

#####链接

行内式：

	This is [Home Page](http://example.com/ "爬山虎") inline link.

	[This link](http://example.net/) has no title attribute.

会产生：

This is [Home Page](http://example.com/ "Title") inline link.

This link [google](http://google.com/) has no title attribute.

参考式：

	This is [an example][id] reference-style link.
	[id]: http://example.com/  "Optional Title Here"

#####强调

Markdown 使用星号（*）和底线（_）作为标记强调字词的符号，被 * 或 _ 包围的字词会被转成用 `<em>` 标签包围，用两个 * 或 _ 包起来的话，则会被转成 `<strong>`，例如：
	*single asterisks*

	_single underscores_

	**double asterisks**

	__double underscores__

输出

*single asterisks*

_single underscores_

**double asterisks**

__double underscores__

但是**如果你的 * 和 _ 两边都有空白的话，它们就只会被当成普通的符号。**


#####图片

Markdown 使用一种和链接很相似的语法来标记图片，同样也允许两种样式： 行内式和参考式。

行内式：

	![Alt text](images/psh.png)

	![Alt text](images/psh.png "标题：爬山虎")

输出

![Alt text](/images/h1.jpg)

![替代文字](/images/h1.jpg "标题：爬山虎")

参考式：

	![Alt text][id]

	[id]: url/to/image  "Optional title attribute"

到目前为止， Markdown 还没有办法指定图片的宽高，如果你需要的话，你可以使用普通的 `<img>` 标签。

####其它

#####自动链接

Markdown 支持以比较简短的自动链接形式来处理网址和电子邮件信箱，只要是用方括号包起来， Markdown 就会自动把它转成链接。一般网址的链接文字就和链接地址一样，例如：

	<http://example.com/>

输出

<http://example.com/>

邮址的自动链接也很类似，只是 Markdown 会先做一个编码转换的过程，把文字字符转成 16 进位码的 HTML 实体，这样的格式可以糊弄一些不好的邮址收集机器人，例如：

	<address@example.com>

会转化成

	<a href="&#x6D;&#x61;i&#x6C;&#x74;&#x6F;:&#x61;&#x64;&#x64;&#x72;&#x65;
	&#115;&#115;&#64;&#101;&#120;&#x61;&#109;&#x70;&#x6C;e&#x2E;&#99;&#111;
	&#109;">&#x61;&#x64;&#x64;&#x72;&#x65;&#115;&#115;&#64;&#101;&#120;&#x61;
	&#109;&#x70;&#x6C;e&#x2E;&#99;&#111;&#109;</a>

输出

<address@example.com>

#####反斜杠

Markdown 支持以下这些符号前面加上反斜杠来帮助插入普通的符号：

	\   反斜线
	`   反引号
	*   星号
	_   底线
	{}  花括号
	[]  方括号
	()  括弧
	#   井字号
	+   加号
	-   减号
	.   英文句点
	!   惊叹号