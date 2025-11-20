import React, { useState } from "react";
import { Separator } from "./components/ui/separator";

function FAQ() {
  const faqs = [
    {
      question: "还不知道怎么写",
      answer: "不过这个React循环挺好用",
    },
    {
      question: "更多内容可以先去更多-问题反馈里面查看",
      answer: "因为这里不好写内容",
    },
    {
      question: ".pth模型转.param和.bin",
      answer: (
        <div>
          请参考
          <a
            className="text-blue-500"
            href="https://cloud.tencent.com/developer/article/2481188"
            target="_blank"
          >
            https://cloud.tencent.com/developer/article/2481188
          </a>
        </div>
      ),
    },
  ];

  const [search, setSearch] = useState("");

  function getItems() {
    return faqs.filter((f) =>
      (f.answer + f.question).toLowerCase().includes(search.toLowerCase())
    );
  }

  return (
    <>
      <div className="grid grid-cols-[200px_1fr] gap-6 mt-5 mx-10">
        <div className="flex flex-col gap-4">
          {getItems().map((faq, index) => (
            <a className="text-blue-500" href={`#faq_${index}`} key={index}>
              {faq.question}
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-5">
          {getItems().map((faq, index) => (
            <>
              <div className="space-y-1" key={index} id={`faq_${index}`}>
                <h2 className="text-xl font-bold">{faq.question}</h2>
                <div>{faq.answer}</div>
              </div>
              <Separator />
            </>
          ))}
        </div>
      </div>
    </>
  );
}

export default FAQ;
