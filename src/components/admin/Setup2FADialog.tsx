import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"
import { Shield, Smartphone, CheckCircle, Copy } from "lucide-react"
import QRCode from 'qrcode'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function Setup2FADialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll')
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [factorId, setFactorId] = useState<string>('')
  const [challengeId, setChallengeId] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [factors, setFactors] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadExistingFactors()
    }
  }, [open])

  const loadExistingFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      setFactors(data?.totp || [])
    } catch (error: any) {
      console.error('Error loading factors:', error)
    }
  }

  const startEnrollment = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Admin 2FA'
      })

      if (error) throw error

      if (data) {
        setFactorId(data.id)
        setSecret(data.totp.secret)
        
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(data.totp.uri)
        setQrCode(qrCodeDataUrl)
        
        setStep('verify')
      }
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const verifyEnrollment = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // First create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      })

      if (challengeError) throw challengeError

      // Then verify with the code
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode
      })

      if (error) throw error

      toast({
        title: "2FA enabled successfully",
        description: "Your two-factor authentication has been set up successfully.",
      })

      onOpenChange(false)
      resetDialog()
      loadExistingFactors()
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const unenrollFactor = async (factorId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error

      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled.",
      })
      
      loadExistingFactors()
    } catch (error: any) {
      toast({
        title: "Failed to disable 2FA",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast({
      title: "Secret copied",
      description: "The setup secret has been copied to your clipboard.",
    })
  }

  const resetDialog = () => {
    setStep('enroll')
    setQrCode('')
    setSecret('')
    setFactorId('')
    setChallengeId('')
    setVerificationCode('')
  }

  const handleClose = () => {
    onOpenChange(false)
    resetDialog()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Two-Factor Authentication Setup</span>
          </DialogTitle>
          <DialogDescription>
            Secure your admin account with an additional layer of protection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {factors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Active 2FA Methods</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {factors.map((factor) => (
                  <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{factor.friendly_name || 'TOTP Authenticator'}</p>
                        <p className="text-sm text-muted-foreground">
                          Status: {factor.status}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unenrollFactor(factor.id)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {step === 'enroll' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Set Up New Authenticator</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add a new TOTP authenticator app to your account.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Before you begin:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>Make sure you have access to your phone</li>
                    <li>Click "Start Setup" to generate a QR code</li>
                  </ol>
                </div>
                
                <Button onClick={startEnrollment} disabled={loading} className="w-full">
                  {loading ? 'Setting up...' : 'Start 2FA Setup'}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'verify' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scan QR Code</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app, then enter the verification code.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  {qrCode && (
                    <img 
                      src={qrCode} 
                      alt="2FA QR Code" 
                      className="border rounded-lg p-4 bg-white"
                    />
                  )}
                  
                  <div className="w-full">
                    <Label className="text-sm font-medium">Manual Setup Key</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={secret} 
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySecret}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use this key if you can't scan the QR code
                    </p>
                  </div>

                  <div className="w-full space-y-2">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center font-mono text-lg tracking-widest"
                    />
                  </div>

                  <Button 
                    onClick={verifyEnrollment} 
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {step === 'verify' ? 'Cancel' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}