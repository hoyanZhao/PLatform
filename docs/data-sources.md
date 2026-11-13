# 官方来源与模拟数据登记

开发资料核对日期：2026-11-12（Asia/Shanghai）。**专业人工核验：尚未完成**，因此配置中人工核验时间为 null。

| 来源                 | 链接                                                                                         | 使用方式与核验边界                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 香港税务局           | https://www.ird.gov.hk/eng/tax/bus_pft.htm                                                   | 开发时核对公司标准16.5%、两级制8.25%/16.5%与200万港币阈值；企业资格仍待核验              |
| 创新科技署 ESS       | https://www.itf.gov.hk/en/funding-programmes/supporting-research/ess/index.html              | 开发时核对香港注册、有效商业登记、组织身份限制、等额配对及最高1000万港币；具体项目待审批 |
| 研究人才库           | https://www.itf.gov.hk/en/funding-programmes/nurturing-talent/research-talent-hub/index.html | 开发时确认各分类入口；不推定个人学历或金额                                               |
| 入境处高才通         | https://www.immd.gov.hk/eng/services/visas/TTPS.html                                         | 开发时核对个人计划性质；不据企业投资额作资格判断                                         |
| 入境处优才           | https://www.immd.gov.hk/eng/services/visas/quality_migrant_admission_scheme.html             | 开发时确认计划入口；个人评核按当期原文                                                   |
| 创新科技署科技人才   | https://www.itc.gov.hk/en/fund_app/techtas/index.html                                        | 开发时确认可访问的官方页面；不采用已失效的入境处旧地址                                   |
| 公司注册处           | https://www.cr.gov.hk/                                                                       | 提供注册与持续义务官方入口，尚未逐项核验全部法定期限                                     |
| 国家外汇管理局       | https://www.safe.gov.cn/                                                                     | 提供跨境资金主管机关入口，不替代ODI、外汇或银行核验                                      |
| 香港政府新闻公报 RSS | https://www.info.gov.hk/gia/rss/general_en.xml                                               | 开发时真实抓取成功，先读robots，元信息仅供资讯展示                                       |
| 投资推广署           | https://www.investhk.gov.hk/en/news/                                                         | 轻量列表适配；robots返回无法可靠解析的内容时跳过，不绕过限制                             |
| 香港政府新闻网财经   | https://www.news.gov.hk/chi/categories/finance/index.html                                    | 轻量列表适配；结构不匹配时显示失败并保留旧缓存                                           |

本地政策条目是指引摘要和归档索引，不冒充官方原文。日期未披露时留空，不把核对日作为政策发布日期。截止日默认未填，不假设补贴统一过期日。

`cases.json` 三个样本全部为虚构企业场景；其中未提供的补贴数据为 null。`talent-resources.json` 三组全为虚构能力标签，不包含真实人员、简历、电话或招聘授权。页面和报告统一标注【演示模拟数据，非真实企业 / 人才】。

字体来自 Google Fonts Noto Sans SC，文件内版权标识：`(c) 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'.`。按 SIL OFL 1.1 分发，完整许可证见 `assets/fonts/OFL.txt`；没有修改字体。ECharts、Puppeteer及其他依赖许可证保留于安装后的各依赖目录。
