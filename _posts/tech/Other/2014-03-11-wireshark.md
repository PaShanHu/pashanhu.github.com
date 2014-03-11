---
layout: default
title: 抓包分析快速开始
category: tech
tags: [wireshark, 抓包分析]
description: <p>工作中要用到抓包分析，分析Web Service调用与普通HTTP+JSON形式调用的数据传输量，而之前没接触过这方面，本文算是网上搜索后的一点总结，即wiresharp使用方法与抓包分析的快速开始。</p><p>软件就是wireshark，只介绍基本的使用，着重于快速入门而非系统或透彻的理解。</p>
---


工作中要用到抓包分析，之前一点基础都没有，那怎么办？谷歌与百度。

首先是一些网上一些资料的罗列：

-	[wireshark怎么抓包、wireshark抓包详细图文教程](http://www.cr173.com/html/20128_all.html)
-	[wireshark抓取访问本地服务器的数据包](http://fangwei.iteye.com/blog/840992)
-	[Wireshark抓包工具使用教程以及常用抓包规则](http://fangxin.blog.51cto.com/1125131/735178/)
-	[route add命令详解](http://www.cnblogs.com/Real_Dream/articles/1577889.html)

资料可自行查看，下面就是快速入门了。

###wireshark安装与快速开始

Wireshark 是网络包分析工具。网络包分析工具的主要作用是尝试捕获网络包， 并尝试显示包的尽可能详细的情况。Wireshark可能算得上是今天能使用的最好的开源网络分析软件。

那么，首先下载wireshark安装包，并安装该软件。**在此声明一下**，我的操作系统是win7，抓包分析也是针对windows环境，Linux下应该会有不同，但在此不做叙述。

下载地址 <http://www.cr173.com/soft/44435.html>

安装过程很简单，按部就班安装就行。但**注意**，安装期间会要求安装**winpcap**，这个必须安装，因为winpcap包含底层的驱动与类库包，wireshark是依赖于winpcap的。

安装完成后，抓包分析就可以开始了。

#####基本使用与抓包快速开始

初学者打开wireshark，开始抓包时，可能会被显示区海量的信息吓到，或者是根本找不到你要的信息。那么最迫切的或者说使用wireshark首先要做的就是学会使用过滤器。

**过滤器有两种：**

*	一种是显示过滤器，就是主界面上的Filter，用来过滤要显示的记录。

*	一种是捕获过滤器，用来过滤捕获的封包，以免捕获太多的记录。可以在Capture -> Capture Filters 中设置。

**过滤表达式：**

之所以加粗显示，因为过滤表达式是我们快速使用wireshark的核心部分。

表达式规则：

1.	协议过滤

	比如TCP，只显示TCP协议。

2.	IP过滤

	比如 ip.src ==192.168.1.128 显示源地址为192.168.1.128，ip.dst==192.168.1.234, 限定目标地址为192.168.1.234。

3.	端口过滤

	tcp.port ==80，端口为80。
	tcp.srcport == 80，只显示TCP协议的源端口为80的。

4.	Http模式过滤

	http.request.method=="GET"，只显示HTTP GET方法的。

5.	逻辑运算符

	and 与 or，同时可以用括号。

**封包信息读取**

前面都是怎么过滤，但你真正找到了你要的封包后，怎么看？怎么找到相应信息？

相信学过《计算机网络》的同学应该没问题，比如tcp连接的3次握手建立连接、4次握手关闭连接，其实都可以轻松找出来。幸好我也学过这门课，虽然差不多都还给老师了，但看到这些封包，就有淡淡的即视感。 ;) 

在封包列表块，我们可以快速浏览每个封包的 source （源ip）、destination （目的ip）、protocol（协议，最基本的有tcp、http、DNS等等）、info（封包基本信息）、length（封包大小）等。

其实通过前面的过滤器，我们基本可以找出我们想要的封包了，然后点击封包列表某项，我们就可以在下面查看其详细信息了。

比如我们想看某个http请求过程，我们基本就可以看到对应的 get 请求封包，在里面可以查看请求的URL地址，源ip和目的ip等等。

然后http响应封包内，我们就可以查看mediatype，看到服务器响应的具体数据。

###怎么抓取访问本地服务器的数据包

有一种状况很常见：程序开发时，服务器建在本地，你在本地访问访问服务器，那怎么通过wireshark来查看数据包？

通常情况下wireshark是捕获不了这种数据包的，只能变通一下，把本机路由到网关再路由回来。

管理员身份执行cmd，执行：

	route add 本机ip mask 255.255.255.255 网关ip

这样，wireshark就能捕获访问本地服务器的数据包了。

实际测试中，的确可以捕获这种类型的数据包，但常常伴随着`TCP out of order`错误。并且这种包正好与正确的包在类型、数据大小等上一致，即相当于正确包的一个copy。这是什么原因？

网上对`out of order`通常的解释是网络拥塞，导致顺序包抵达时间不同，延时太长，或者包丢失。这种解释不算错，还有一段英文解释，我认为讲的更清晰。地址：<http://ask.wireshark.org/questions/1698/tcp-out-of-order-what-does-it-means>，内容：

>It simply means that particular frame was received in a different order from which it was sent (after a later packet in the sequence). It is not generally a problem. It probably indicates there are multiple paths between source and destination - and one travels a through a longer path. It means TCP has slightly more work to reassemble segments in the correct order.

核心意思就是在源地址和目的地址之间可能存在多条通路，通过不同路径到达可能会造成失序。通常情况下，这不是什么问题，只是tcp层要做更多工作而已。

