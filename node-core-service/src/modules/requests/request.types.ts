// Frontend CreateRequestPanel.jsx ve NotificationRequest ile uyumlu

export interface CreateRequestInput {
  type:      string;     // her zaman 'request'
  category:  string;    // expense | trip | team | personal
  title:     string;
  text:      string;    // detail/gerekçe
  userName?: string;    // gönderenin adı (denormalize)
  senderId?: string;    // gönderenin userId'si
  teamId:    string;
  targetId?: string;
  path?:     string;
}

export interface RespondInput {
  action:           'approved' | 'rejected';
  rejectionReason?: string;
}

export {};
