export interface MappedRequest {
  id:               string;
  type:             string;
  teamId:           string;
  category:         string;
  user:             string;   // DB'de userName olarak tutulur
  title:            string;
  detail:           string;   // DB'de text alanı
  date:             string;
  targetId?:        string;
  path:             string;
  status:           'pending' | 'approved' | 'rejected';
  userId?:          string;   // senderId alanından
  rejectionReason?: string;
}

export interface MappedNotificationInfo {
  id:        string;
  type:      'info' | 'invite';
  userId:    string;
  category?: string;
  text:      string;
  date:      string;
  teamId?:   string;
  sender?:   string;
}

export interface NotificationData {
  requests:      MappedRequest[];
  notifications: MappedNotificationInfo[];
}

export interface CreateInfoInput {
  userId:    string;
  type:      'info' | 'invite';
  category?: string;
  text:      string;
  teamId?:   string;
  senderId?: string;
  path?:     string;
}

export {};
