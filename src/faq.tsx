import Search from 'antd/es/input/Search';
import React, { useState } from 'react';

function FAQ() {
  const faqs = [
    {
      question: '还不知道怎么写',
      answer: '不过这个React循环挺好用',
    },
    {
      question: '更多内容可以先去更多-问题反馈里面查看',
      answer: '因为这里不好写内容',
    },
    {
      question: '.pth模型转.param和.bin',
      answer: (
        <>
          请参考
          <a
            href="https://cloud.tencent.com/developer/article/2481188"
            target="_blank"
          >
            https://cloud.tencent.com/developer/article/2481188
          </a>
        </>
      ),
    },
  ];

  const [searchItems, setSearchItem] = useState(faqs);
  const handleSearch = (value: string) => {
    setSearchItem(
      faqs.filter((item) =>
        item.question.toLowerCase().includes(value.toLowerCase())
      )
    );
  };
  return (
    <>
      <h1>常见问题</h1>
      <div className="faq-main">
        <div className="faq-nav">
          <Search
            onSearch={handleSearch}
            onInput={(e) => handleSearch(e.currentTarget.value)}
          />
          {searchItems.map((faq, index) => (
            <a href={`#faq_${index}`} key={index}>
              {faq.question}
            </a>
          ))}
        </div>
        <ul className="faq-list">
          {searchItems.map((faq, index) => (
            <li key={index} id={`faq_${index}`}>
              <h2>{faq.question}</h2>
              <p>{faq.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default FAQ;
