import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQSectionProps {
  className?: string;
}

export const FAQSection = ({ className }: FAQSectionProps = {}) => {
  const faqs = [
    {
      question: "How do I save links from apps?",
      answer: "Simply use the share button on YouTube, Instagram, TikTok, or any platform and select Tagmentia from the share menu. On desktop, you can use our browser extension or manually paste links."
    },
    {
      question: "What are snapshots?",
      answer: "Snapshots are visual notes - screenshots you can attach to your saved links. They help you remember key moments, diagrams, or important information from videos or web content."
    },
    {
      question: "Can I switch plans anytime?",
      answer: "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll get immediate access to premium features. Downgrades take effect at the end of your current billing period."
    },
    {
      question: "Do you offer a free plan?",
      answer: "Absolutely! Our free plan includes basic categories, limited snapshots (5), notes & reminders, and search & filters. It's perfect for getting started and trying out Tagmentia."
    },
    {
      question: "What will Gold include?",
      answer: "Gold Plan features are currently unavailable. Premium Plan offers unlimited categories, unlimited videos per category, unlimited snapshots, and 500 MB storage quota."
    },
    {
      question: "How is my data stored?",
      answer: "Your data is securely stored using enterprise-grade encryption. We use Supabase with industry-standard security practices. Your videos stay on their original platforms - we only save the links and your notes."
    }
  ];

  return (
    <section id="faq" className={`py-20 px-6 ${className || 'bg-gray-50'}`}>
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about Tagmentia
          </p>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-lg font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
