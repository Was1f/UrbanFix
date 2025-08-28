// nid-verification-app/services/ocrService.js

import TextRecognition from '@react-native-ml-kit/text-recognition';

class OCRService {
  constructor() {
    this.isMLKitAvailable = true;
  }

  async extractText(imageUri) {
    try {
      // Check if ML Kit is available (for Expo Go fallback)
      if (!TextRecognition) {
        console.log('ML Kit not available, using fallback');
        this.isMLKitAvailable = false;
        return '';
      }

      const result = await TextRecognition.recognize(imageUri);
      console.log('Raw OCR Text:', result.text);
      
      return result.text;
    } catch (error) {
      console.error('OCR Error:', error);
      this.isMLKitAvailable = false;
      return '';
    }
  }

  // Validate if the image contains a valid NID card
  validateNIDCard(text) {
    if (!text || text.trim().length === 0) return false;
    
    const validationPatterns = [
      /NATIONAL ID CARD/i,
      /Government of the People's Republic of Bangladesh/i,
      /জাতীয় পরিচয় পত্র/,
      /Name:/i,
      /Date of Birth:/i,
      /ID NO:/i,
      /NID No:/i
    ];

    const matchCount = validationPatterns.reduce((count, pattern) => {
      return text.match(pattern) ? count + 1 : count;
    }, 0);

    // If at least 2 patterns match (lowered threshold for ML Kit), consider it a valid NID
    return matchCount >= 2;
  }

  // Extract specific data from OCR text
  extractNIDData(text) {
    const data = {
      name: '',
      dateOfBirth: '',
      nidNumber: '',
      address: ''
    };

    if (!text) return data;

    try {
      // Extract Name (English) - more flexible patterns for ML Kit
      const namePatterns = [
        /Name:\s*([A-Z][A-Za-z\s]+)/i,
        /নাম:\s*([A-Z][A-Za-z\s]+)/i,
        /^([A-Z][A-Z\s]+)$/m // Line with all caps (often name on NID)
      ];

      for (const pattern of namePatterns) {
        const nameMatch = text.match(pattern);
        if (nameMatch && nameMatch[1].trim().length > 2) {
          data.name = nameMatch[1].trim();
          break;
        }
      }

      // Extract Date of Birth - more flexible patterns
      const dobPatterns = [
        /Date of Birth:\s*(\d{1,2}\s+\w+\s+\d{4})/i,
        /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
        /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
        /জন্ম তারিখ:\s*(\d{1,2}\s+\w+\s+\d{4})/i
      ];
      
      for (const pattern of dobPatterns) {
        const dobMatch = text.match(pattern);
        if (dobMatch) {
          data.dateOfBirth = dobMatch[1].trim();
          break;
        }
      }

      // Extract NID Number (10-17 digits) - more flexible
      const nidPatterns = [
        /ID NO:\s*(\d{10,17})/i,
        /NID No:\s*(\d{10,17})/i,
        /(\d{10,17})/g
      ];

      for (const pattern of nidPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          // Filter for valid NID numbers (10+ digits)
          const validNIDs = matches.filter(match => {
            const digits = match.replace(/\D/g, '');
            return digits.length >= 10 && digits.length <= 17;
          });
          
          if (validNIDs.length > 0) {
            data.nidNumber = validNIDs[0].replace(/\D/g, '');
            break;
          }
        }
      }

      // Extract Address - simplified for ML Kit
      const addressPatterns = [
        /ঠিকানা:([\s\S]*?)(?=\n\n|Blood Group|রক্তের গ্রুপ)/i,
        /Address:([\s\S]*?)(?=\n\n|Blood Group)/i
      ];

      for (const pattern of addressPatterns) {
        const addressMatch = text.match(pattern);
        if (addressMatch) {
          data.address = addressMatch[1].trim();
          break;
        }
      }

      // Fallback address extraction
      if (!data.address) {
        const lines = text.split('\n');
        const addressKeywords = ['গ্রাম', 'থানা', 'জেলা', 'পোস্ট', 'উপজেলা', 'Village', 'Thana', 'District'];
        for (const line of lines) {
          if (addressKeywords.some(keyword => line.includes(keyword))) {
            data.address = line.trim();
            break;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Error extracting NID data:', error);
      return data;
    }
  }

  // Complete OCR process with validation
  async processNIDImage(imageUri) {
    try {
      const text = await this.extractText(imageUri);
      
      // If ML Kit is not available (Expo Go), provide manual entry fallback
      if (!this.isMLKitAvailable || !text || text.trim().length === 0) {
        return {
          success: true,
          data: { name: '', dateOfBirth: '', nidNumber: '', address: '' },
          rawText: '',
          isValid: false,
          note: 'OCR unavailable. Please enter information manually.'
        };
      }

      const isValid = this.validateNIDCard(text);
      const extractedData = this.extractNIDData(text);

      return {
        success: true,
        data: extractedData,
        rawText: text,
        isValid,
        note: isValid ? 'NID card detected and processed' : 'Image processed, please verify extracted information'
      };

    } catch (error) {
      console.error('OCR Processing Error:', error);
      
      // Graceful fallback for any OCR errors
      return {
        success: true,
        data: { name: '', dateOfBirth: '', nidNumber: '', address: '' },
        rawText: '',
        isValid: false,
        note: 'OCR failed. Please enter information manually.'
      };
    }
  }
}

export default new OCRService();