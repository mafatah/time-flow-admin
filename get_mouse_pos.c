#include <ApplicationServices/ApplicationServices.h>
#include <stdio.h>

int main() {
    CGEventRef event = CGEventCreate(NULL);
    CGPoint cursor = CGEventGetLocation(event);
    CFRelease(event);
    
    printf("%.0f,%.0f\n", cursor.x, cursor.y);
    return 0;
} 