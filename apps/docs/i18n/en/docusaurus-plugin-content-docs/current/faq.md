---
title: FAQ & Help
sidebar_position: 9
---

# Common Questions & Troubleshooting

<p align="center"><img src="/img/illustrations/illo-search.svg" alt="Search illustration" width="240" /></p>

Collection of frequently asked questions and solutions for common issues you may encounter.

## For All Users

### Login & Account

**Q: How do I login?**
A: See the [How to Login](./memulai/login.md) page for complete guide. Username can be your username or phone number, password is your password.

**Q: I forgot my password, what should I do?**
A: Click "Forgot Password?" on the login page. Or contact admin to reset your password.

**Q: Can I change my password in the app?**
A: Yes, open **Menu → Profile → Settings → Change Password**.

**Q: My phone number has changed, can I update it?**
A: Contact admin to update your phone number in the system.

**Q: My account can't login, why?**
A: Possible reasons:
- Password is wrong (try reset)
- Account not activated yet (contact admin)
- Phone number not registered (contact admin to register)

---

### Connection & Offline

**Q: What does the "OFFLINE" status mean?**
A: The app is not connected to the internet. You can still use local features (view history, create drafts), but data cannot upload until connection returns.

**Q: What if GPS is offline when I clock in?**
A: You can still clock in. Data will be saved locally and uploaded when connection returns.

**Q: How long can offline data be stored?**
A: Offline data is stored for up to 7 days. Try to synchronize daily.

**Q: Connection dropped while uploading a report, what happens?**
A: The report will be saved as a local draft. When connection returns, tap "Upload" to send to server.

---

### Notifications & Messages

**Q: Not receiving notifications, why?**
A: Possible reasons:
- Notifications are turned off in device settings (open Settings → Notifications → SEKAR)
- Silent/DND mode is active
- App doesn't have notification permission

**Q: How do I change notification settings?**
A: Menu → Profile → Settings → Notifications. Manage notifications per type (new task, validated report, etc).

---

## For Satgas / Linmas / Korlap

### Attendance & Presence

**Q: GPS is not accurate / says I'm outside the radius, but I'm in the area.**
A: Possible reasons:
- GPS needs time to fix (wait 1-2 minutes)
- You're under a dense canopy (move to more open area)
- Change location mode to "High Accuracy" in settings
- **The system won't block clock in**, data will be recorded for supervisor.

**Q: Clocked in successfully but doesn't show on Home page.**
A: Close the app completely, open it again, and refresh the page.

**Q: Shows as late, but I arrived earlier.**
A: Possible GPS timing inaccuracy. Communicate with supervisor and provide proof (screenshot of time).

**Q: Can I clock in for a friend who hasn't arrived yet?**
A: **No**. Clock in must be done by the worker themselves. If your friend hasn't arrived, report to supervisor.

---

### Reports & Tasks

**Q: My report was rejected, do I need to create a new one?**
A: Yes, create a new report with improvements based on supervisor feedback (more detailed description, clearer photos, etc).

**Q: Report photo can't upload, "file too large".**
A: The app should auto-compress photos. Try:
- Retake photo with lower resolution
- Reduce number of photos (create separate report if needed)

**Q: Didn't receive notification of new task from korlap.**
A: Possible reasons:
- You weren't online when korlap sent the task (sync when online)
- Notifications are turned off
- There's a technical issue (check task list in app)

**Q: Task deadline has passed, can I still submit?**
A: Yes, but it will be recorded as late. Supervisor will know.

---

### Overtime

**Q: How do I request overtime?**
A: See the [Requesting Overtime](./satgas/lembur.md) page for complete guide.

**Q: My overtime request was rejected, why?**
A: Check supervisor feedback. Possible reasons:
- Supervisor schedule doesn't allow
- Different overtime policy that day
- Need further discussion

**Q: Can I work overtime without requesting first?**
A: **Not recommended**. Always request first. If forced to work without request, report to supervisor with full explanation.

---

### Monitoring (For Korlap)

**Q: How long can I see location history?**
A: Usually 30-90 days. For older data, contact admin.

**Q: Worker marker doesn't show on monitoring map.**
A: Possible reasons:
- Worker hasn't clocked in yet
- Worker is offline (GPS not active)
- There's a server issue

---

## For Rayon Head & Admin

### Dashboard & Reports

**Q: Dashboard is not showing latest data.**
A: 
1. Refresh page (F5 or pull-to-refresh)
2. Log out and login again
3. Check internet connection is stable
4. Restart browser if still failing

**Q: My report differs from worker dashboard, why?**
A: Possible reasons:
- There are reports pending validation (pending status)
- Data not fully synchronized yet (wait a few minutes)
- Time/timezone difference

**Q: How do I export reports for presentation?**
A: See [Reports & Analytics](./kepala-rayon/laporan.md) page. Export to PDF or Excel format.

---

### User Management

**Q: Can't create new user, "phone number already registered".**
A: Phone number must be unique. Check the user list if the number already exists. If someone else has it, contact admin to deactivate first.

**Q: Want to change user role from Satgas to Korlap.**
A: Open user profile → Edit → Change role to Korlap → Save.

**Q: How do I import many users at once?**
A: See [User Management](./admin/kelola-pengguna.md) page for Excel import guide.

---

## Technical Troubleshooting

### Mobile App

**Q: App crashes / frequently force closes.**
A: Solutions:
1. Restart app
2. Clear cache: Settings → Apps → SEKAR → Clear Cache
3. Uninstall and reinstall
4. Contact admin if still crashing (send error log)

**Q: App runs slow / lag.**
A: Solutions:
1. Close other running apps
2. Clear app cache
3. Reduce screen brightness (saves power, smoother)
4. Upgrade device if too old / low spec

**Q: Metro or update stuck on progress bar.**
A: Solutions:
1. Wait 5-10 minutes (don't close)
2. If still stuck, force stop app
3. Open again

**Q: Storage full, app error.**
A: Solutions:
1. Open Settings → Storage
2. Delete unnecessary files/apps
3. Restart device
4. Open SEKAR again

---

### Web Dashboard

**Q: Page won't load / loading forever.**
A: Solutions:
1. Refresh page (F5 or Ctrl+Shift+R for hard refresh)
2. Clear browser cache
3. Try another browser (Chrome, Firefox, Safari)
4. Check internet connection
5. Contact admin if still failing

**Q: Button or form not responsive.**
A: Solutions:
1. Refresh page
2. Check browser console for error (F12 → Console)
3. Try another browser
4. Clear cache and login again

**Q: Report or data not showing on dashboard.**
A: Solutions:
1. Refresh page
2. Check filters (there might be a filter hiding data)
3. Check connection and try again
4. Log out and login again

---

### Database & Data

**Q: Data I created yesterday is not here today.**
A: Possible reasons:
- Data not synchronized (make sure online when creating data)
- Error when saving (check error message)
- Wrong area/rayon selected when checking

**Q: Report I submitted doesn't show to supervisor.**
A: Possible reasons:
- Report not uploaded yet (check status in app)
- Connection dropped during upload
- Technical error

**Solutions:**
1. Check report status in app ("Waiting for Validation" = sent)
2. If still draft, tap "Upload/Send"
3. Check your report in worker page (from supervisor)
4. Contact admin if still not showing

---

## Performance & Optimization

### Phone Running Slow?

**Save Battery & Improve Performance:**

1. **Reduce Brightness** — Settings → Display → auto brightness or 30-40%
2. **Close Background Apps** — Swipe up recent apps, close unused ones
3. **Update App** — Make sure SEKAR has latest version
4. **Clear Cache** — Settings → Apps → SEKAR → Clear Cache (not Clear Data)
5. **Disable Bluetooth** — If not using
6. **Restart Device** — Every 1-2 days to reset memory

### GPS Drains Battery?

**Tips for Saving Battery with GPS Active:**

1. **Reduce Screen Brightness** 
- Set to auto or manually lower
- Saves 30-40% battery

2. **Close Other Apps**
- WiFi, Bluetooth, unnecessary background apps
- Saves 10-20% battery

3. **Use Power Bank** 
- Cheap insurance for full-day shifts

4. **Enable Dark Mode** 
- If available in app

5. **Lower Screen Brightness** 
- Battery saving without sacrificing GPS accuracy

---

## Contact Support

### How to Contact Support

**For Technical Issues:**
- **Chat/WhatsApp**: [Support number — contact admin]
- **Email**: support@sekar.dlhsby.go.id
- **Phone**: [Hotline — contact admin]

**For Operational Issues:**
- Contact your supervisor/Korlap
- Or contact your rayon head

**Provide the Following Information When Contacting Support:**
- Your name and phone number
- Your role/position
- Problem description (detailed, not vague)
- Steps you've already tried
- Error message (if any, take screenshot)
- Device & OS (Android vX.X, iOS vX.X, Windows vX.X)

---

## Tips for Using SEKAR Effectively

:::tip
**1. Update App Regularly**
- Check Google Play Store / App Store for updates
- Always use the latest version for bug fixes & features

**2. Synchronize Daily**
- Make sure all data is uploaded (ONLINE status)
- Don't wait days to sync offline data

**3. Good Documentation**
- Clear & detailed report descriptions
- Quality photos (good lighting, clear)
- Link reports to matching tasks

**4. Communication**
- If there's an issue, contact supervisor/admin immediately
- Don't fail silently, report issues for debugging

**5. Data Security**
- Don't share your password with anyone
- Log out after finishing with web dashboard
- Don't save passwords on public computers
:::

---

## Stay Updated

This documentation is updated regularly with new features. **Bookmark this page** for quick reference, or contact admin for the latest updates.

---

**Can't find a solution?** Contact the support team using the contact info above. We're ready to help! 🙌
