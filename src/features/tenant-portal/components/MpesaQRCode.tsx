import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Smartphone } from 'lucide-react';

interface MpesaQRCodeProps {
  paybillNumber?: string | null;
  tillNumber?: string | null;
  accountNumber?: string;
  amount?: number;
}

export const MpesaQRCode = ({ paybillNumber, tillNumber, accountNumber, amount }: MpesaQRCodeProps) => {
  if (!paybillNumber && !tillNumber) {
    return null;
  }

  // Generate M-Pesa QR code data
  // Format: Paybill/Till number with optional account reference
  const generateQRData = (type: 'paybill' | 'till', number: string) => {
    const lines = [`M-Pesa ${type === 'paybill' ? 'Paybill' : 'Till'} Payment`];
    lines.push(`${type === 'paybill' ? 'Business No' : 'Till No'}: ${number}`);
    if (type === 'paybill' && accountNumber) {
      lines.push(`Account: ${accountNumber}`);
    }
    if (amount) {
      lines.push(`Amount: KES ${amount.toLocaleString()}`);
    }
    return lines.join('\n');
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4 text-green-600" />
          Scan to Pay
        </CardTitle>
        <CardDescription className="text-xs">
          Scan with your phone camera to copy payment details
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-6 justify-center">
        {paybillNumber && (
          <div className="text-center space-y-2">
            <div className="p-3 bg-white rounded-lg inline-block shadow-sm border">
              <QRCodeSVG
                value={generateQRData('paybill', paybillNumber)}
                size={120}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Paybill: {paybillNumber}</p>
          </div>
        )}
        {tillNumber && (
          <div className="text-center space-y-2">
            <div className="p-3 bg-white rounded-lg inline-block shadow-sm border">
              <QRCodeSVG
                value={generateQRData('till', tillNumber)}
                size={120}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Till: {tillNumber}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
