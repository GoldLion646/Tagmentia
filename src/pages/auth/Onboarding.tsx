import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";

const onboardingSteps = [
  {
    id: 1,
    title: "Welcome!",
    description: "Your registration was successful. Get ready to explore your personalized dashboard.",
    image: "🎉",
    buttonText: "Next"
  },
  {
    id: 2,
    title: "Organize Your Favorite Videos — All in One Place",
    description: "Save videos from YouTube, TikTok, and Instagram Reels into personalized categories with notes and reminders.",
    buttonText: "Next"
  },
  {
    id: 3,
    title: "Turn Video Watching Into Actionable Learning",
    description: "Track educational videos by adding notes, reminders, and grouping by category.",
    buttonText: "Next"
  },
  {
    id: 4,
    title: "The Smartest Way to Bookmark and Categorize Videos",
    description: "Automatically save videos from Instagram Reels and organize them with tags, notes, and folders using our dashboard.",
    buttonText: "Get Started"
  }
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const { currentLogoUrl } = useLogoConfiguration();

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/dashboard");
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Indicator */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {currentStep + 1} of {onboardingSteps.length}
          </span>
          {currentStep > 0 && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </Button>
          )}
        </div>
        <div className="w-full bg-muted rounded-full h-1">
          <div 
            className="bg-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 flex flex-col items-center text-center">
        {/* Welcome Step */}
        {currentStep === 0 && (
          <>
            {/* Logo */}
            <div className="mb-8">
              <div className="flex items-center justify-center">
                {currentLogoUrl ? (
                  <img 
                    src={currentLogoUrl} 
                    alt="Logo" 
                    className="h-16 max-w-[200px] object-contain"
                    onError={(e) => {
                      // Fallback to text logo if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <div className="h-16 w-32 bg-muted/20 animate-pulse rounded" />
                )}
              </div>
            </div>
            
            <div className="text-6xl mb-6">{currentStepData.image}</div>
          </>
        )}

        {/* Feature Steps */}
        {currentStep > 0 && (
          <div className="w-64 h-64 rounded-3xl flex items-center justify-center mb-8">
            {currentStep === 1 && (
              <img 
                src="/lovable-uploads/4ad05a0c-e35c-45bc-a96f-43d77c0c6124.png" 
                alt="Organize videos illustration"
                className="w-full h-full object-contain"
              />
            )}
            {currentStep === 2 && (
              <img 
                src="/lovable-uploads/cd8bb079-2d41-4a9d-a149-cb26f5e07601.png" 
                alt="AI learning illustration"
                className="w-full h-full object-contain"
              />
            )}
            {currentStep === 3 && (
              <img 
                src="/lovable-uploads/8df9e558-c5f3-47bc-9aef-37f6af75ce65.png" 
                alt="Dashboard analytics illustration"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        )}

        {/* Text Content */}
        <div className="max-w-sm mx-auto mb-12">
          <h1 className="text-2xl font-bold text-foreground mb-4 leading-tight">
            {currentStepData.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Navigation Button */}
        <div className="w-full max-w-sm">
          <Button
            onClick={handleNext}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-medium text-lg"
          >
            <span>{currentStepData.buttonText}</span>
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;