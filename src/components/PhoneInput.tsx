import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Country codes with phone prefixes
const countryCodes = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dialCode: '+32' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dialCode: '+41' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', dialCode: '+43' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', dialCode: '+45' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dialCode: '+46' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dialCode: '+47' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', dialCode: '+358' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', dialCode: '+48' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dialCode: '+420' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', dialCode: '+36' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', dialCode: '+40' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', dialCode: '+359' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', dialCode: '+385' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', dialCode: '+386' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', dialCode: '+421' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', dialCode: '+372' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', dialCode: '+371' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', dialCode: '+370' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dialCode: '+353' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', dialCode: '+30' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', dialCode: '+357' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', dialCode: '+356' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', dialCode: '+354' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', dialCode: '+423' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', dialCode: '+377' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', dialCode: '+378' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦', dialCode: '+39' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', dialCode: '+376' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', dialCode: '+7' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', dialCode: '+375' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dialCode: '+380' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', dialCode: '+373' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', dialCode: '+381' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', dialCode: '+382' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', dialCode: '+387' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰', dialCode: '+389' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', dialCode: '+355' },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰', dialCode: '+383' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dialCode: '+90' },
  { code: 'CN', name: 'China', flag: '🇨🇳', dialCode: '+86' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', dialCode: '+82' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', dialCode: '+960' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '+977' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', dialCode: '+975' },
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', dialCode: '+93' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', dialCode: '+66' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dialCode: '+84' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', dialCode: '+95' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', dialCode: '+855' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', dialCode: '+856' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dialCode: '+62' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', dialCode: '+673' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱', dialCode: '+670' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯', dialCode: '+679' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', dialCode: '+675' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', dialCode: '+677' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', dialCode: '+678' },
  { code: 'NC', name: 'New Caledonia', flag: '🇳🇨', dialCode: '+687' },
  { code: 'PF', name: 'French Polynesia', flag: '🇵🇫', dialCode: '+689' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', dialCode: '+685' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', dialCode: '+676' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', dialCode: '+686' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', dialCode: '+680' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲', dialCode: '+691' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', dialCode: '+692' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', dialCode: '+674' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', dialCode: '+688' },
  { code: 'CK', name: 'Cook Islands', flag: '🇨🇰', dialCode: '+682' },
  { code: 'NU', name: 'Niue', flag: '🇳🇺', dialCode: '+683' },
  { code: 'TK', name: 'Tokelau', flag: '🇹🇰', dialCode: '+690' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾', dialCode: '+218' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', dialCode: '+216' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', dialCode: '+213' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', dialCode: '+212' },
  { code: 'EH', name: 'Western Sahara', flag: '🇪🇭', dialCode: '+212' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', dialCode: '+249' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', dialCode: '+211' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dialCode: '+251' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', dialCode: '+291' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dialCode: '+253' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', dialCode: '+252' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', dialCode: '+256' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dialCode: '+255' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', dialCode: '+257' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dialCode: '+261' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', dialCode: '+230' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨', dialCode: '+248' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲', dialCode: '+269' },
  { code: 'YT', name: 'Mayotte', flag: '🇾🇹', dialCode: '+262' },
  { code: 'RE', name: 'Réunion', flag: '🇷🇪', dialCode: '+262' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', dialCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dialCode: '+263' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', dialCode: '+267' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', dialCode: '+264' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', dialCode: '+268' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', dialCode: '+266' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', dialCode: '+265' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dialCode: '+258' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', dialCode: '+244' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', dialCode: '+237' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', dialCode: '+236' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩', dialCode: '+235' },
  { code: 'CG', name: 'Congo (Republic)', flag: '🇨🇬', dialCode: '+242' },
  { code: 'CD', name: 'Congo (Democratic Republic)', flag: '🇨🇩', dialCode: '+243' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', dialCode: '+240' },
  { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹', dialCode: '+239' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', dialCode: '+229' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', dialCode: '+221' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', dialCode: '+220' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', dialCode: '+245' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', dialCode: '+224' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dialCode: '+232' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', dialCode: '+231' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dialCode: '+225' },
  { code: 'CV', name: 'Cape Verde', flag: '🇨🇻', dialCode: '+238' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷', dialCode: '+222' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', dialCode: '+592' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', dialCode: '+597' },
  { code: 'GF', name: 'French Guiana', flag: '🇬🇫', dialCode: '+594' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', dialCode: '+51' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dialCode: '+502' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', dialCode: '+501' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dialCode: '+503' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', dialCode: '+504' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dialCode: '+505' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', dialCode: '+507' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', dialCode: '+53' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', dialCode: '+1876' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', dialCode: '+509' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', dialCode: '+1809' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', dialCode: '+1787' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', dialCode: '+1868' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', dialCode: '+1246' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩', dialCode: '+1473' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨', dialCode: '+1784' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', dialCode: '+1758' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲', dialCode: '+1767' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', dialCode: '+1268' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', dialCode: '+1869' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', dialCode: '+1242' },
  { code: 'BM', name: 'Bermuda', flag: '🇧🇲', dialCode: '+1441' },
  { code: 'TC', name: 'Turks and Caicos Islands', flag: '🇹🇨', dialCode: '+1649' },
  { code: 'KY', name: 'Cayman Islands', flag: '🇰🇾', dialCode: '+1345' },
  { code: 'VI', name: 'U.S. Virgin Islands', flag: '🇻🇮', dialCode: '+1340' },
  { code: 'VG', name: 'British Virgin Islands', flag: '🇻🇬', dialCode: '+1284' },
  { code: 'AI', name: 'Anguilla', flag: '🇦🇮', dialCode: '+1264' },
  { code: 'MS', name: 'Montserrat', flag: '🇲🇸', dialCode: '+1664' },
  { code: 'GP', name: 'Guadeloupe', flag: '🇬🇵', dialCode: '+590' },
  { code: 'MQ', name: 'Martinique', flag: '🇲🇶', dialCode: '+596' },
  { code: 'BL', name: 'Saint Barthélemy', flag: '🇧🇱', dialCode: '+590' },
  { code: 'MF', name: 'Saint Martin', flag: '🇲🇫', dialCode: '+590' },
  { code: 'SX', name: 'Sint Maarten', flag: '🇸🇽', dialCode: '+1721' },
  { code: 'CW', name: 'Curaçao', flag: '🇨🇼', dialCode: '+599' },
  { code: 'AW', name: 'Aruba', flag: '🇦🇼', dialCode: '+297' },
  { code: 'BQ', name: 'Caribbean Netherlands', flag: '🇧🇶', dialCode: '+599' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', dialCode: '+967' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', dialCode: '+964' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', dialCode: '+963' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dialCode: '+961' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', dialCode: '+962' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', dialCode: '+972' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', dialCode: '+970' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', dialCode: '+98' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', dialCode: '+374' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', dialCode: '+994' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', dialCode: '+995' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dialCode: '+7' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', dialCode: '+996' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', dialCode: '+992' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', dialCode: '+993' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', dialCode: '+998' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳', dialCode: '+976' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dialCode: '+852' },
  { code: 'MO', name: 'Macao', flag: '🇲🇴', dialCode: '+853' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dialCode: '+886' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵', dialCode: '+850' }
].sort((a, b) => a.name.localeCompare(b.name));

interface PhoneInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder = "Enter phone number", className, required, ...props }, ref) => {
    const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]); // Default to first country (sorted)
    const [open, setOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    // Extract country code and number from value
    React.useEffect(() => {
      if (value) {
        const country = countryCodes.find(c => value.startsWith(c.dialCode));
        if (country) {
          setSelectedCountry(country);
          setPhoneNumber(value.substring(country.dialCode.length));
        } else {
          setPhoneNumber(value);
        }
      }
    }, [value]);

    const handleCountryChange = (country: typeof countryCodes[0]) => {
      setSelectedCountry(country);
      const fullNumber = phoneNumber ? `${country.dialCode}${phoneNumber}` : country.dialCode;
      onChange(fullNumber);
      setOpen(false);
    };

    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const number = e.target.value.replace(/\D/g, ''); // Remove non-digits
      setPhoneNumber(number);
      const fullNumber = number ? `${selectedCountry.dialCode}${number}` : selectedCountry.dialCode;
      onChange(fullNumber);
    };

    return (
      <div className={cn("flex w-full", className)}>
        {/* Country Code Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-shrink-0 border-r-0 rounded-r-none bg-muted/50 border-border hover:bg-muted/70 px-3"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{selectedCountry.flag}</span>
                <span className="text-sm font-mono">{selectedCountry.dialCode}</span>
              </span>
              <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 z-50 bg-background border border-border shadow-md" align="start">
            <Command className="bg-background">
              <CommandInput 
                placeholder="Search country or code..." 
                className="h-9 bg-background border-none focus:ring-0"
              />
              <CommandList className="bg-background max-h-64">
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  No country found.
                </CommandEmpty>
                <CommandGroup className="bg-background">
                  {countryCodes.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.dialCode} ${country.code}`}
                      onSelect={() => handleCountryChange(country)}
                      className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted aria-selected:bg-muted"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-base">{country.flag}</span>
                        <span className="text-foreground">{country.name}</span>
                        <span className="text-sm text-muted-foreground font-mono">{country.dialCode}</span>
                      </span>
                      <Check
                        className={cn(
                          "h-4 w-4 text-primary",
                          selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <Input
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder={placeholder}
          required={required}
          className="rounded-l-none bg-muted/50 border-border focus:ring-2 focus:ring-primary focus:ring-offset-2"
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };