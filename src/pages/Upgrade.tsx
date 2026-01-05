import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Zap, Check } from "lucide-react";
import { Header } from "@/components/Header";

const Upgrade = () => {
  const navigate = useNavigate();

  const features = [
    "Unlimited categories",
    "Unlimited videos per category",
    "AI-powered video summaries",
    "Priority support",
    "Advanced analytics",
    "Custom tags and organization",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Upgrade Required
          </h1>
          <p className="text-lg text-muted-foreground">
            Unlock the full potential of your video library with our premium plans
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Premium Features</CardTitle>
            <CardDescription>
              Get access to all features and take your video management to the next level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-foreground">{feature}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 space-y-3">
              <Button 
                className="w-full bg-gradient-primary hover:shadow-elevated"
                size="lg"
                onClick={() => {
                  // TODO: Navigate to actual subscription/pricing page when implemented
                  console.log("Navigate to subscription page");
                }}
              >
                View Premium Plans
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => navigate(-1)}
              >
                Maybe Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Upgrade;
